import { GoogleGenAI } from "@google/genai";
import { Document, Message, Language, ModelSettings } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Advanced Scoring Algorithm to simulate a Reranker.
 * In production, this would be a Cross-Encoder model (e.g., BGE-Reranker) or a weighted fusion of Sparse (BM25) + Dense vectors.
 */
const calculateRelevanceScore = (doc: Document, query: string): number => {
  const queryLower = query.toLowerCase();
  const docContentLower = doc.content.toLowerCase();
  const docNameLower = doc.name.toLowerCase();
  let score = 0;

  // 1. Exact Phrase Matching (High Precision Boost)
  if (docContentLower.includes(queryLower)) score += 50;
  if (docNameLower.includes(queryLower)) score += 40;

  // 2. Keyword Matching (BM25-style logic)
  const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 2);
  let matchedTerms = 0;

  queryTerms.forEach(term => {
    // Title matches are weighted higher
    if (docNameLower.includes(term)) score += 20;
    
    // Content matches
    const termRegex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matchCount = (docContentLower.match(termRegex) || []).length;
    
    if (matchCount > 0) {
      // Add score based on frequency, but cap it to prevent long documents from dominating purely by length
      score += Math.min(matchCount, 10) * 5; 
      matchedTerms++;
    }
  });

  // 3. Query Coverage Boost
  // If the document contains most of the words in the query, it's likely more relevant
  if (queryTerms.length > 0) {
    const coverageRatio = matchedTerms / queryTerms.length;
    score += coverageRatio * 30;
  }

  // 4. Recency Bias (Slight boost for newer docs)
  // e.g., A document uploaded today gets +10 points, one from 10 days ago gets +0
  const daysSinceUpload = (Date.now() - doc.uploadDate) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 10 - daysSinceUpload); 

  return score;
};

/**
 * Simulates the RAG Retrieval step with simulated Reranking.
 */
const retrieveDocuments = (query: string, documents: Document[], role: string, useHybridSearch: boolean): Document[] => {
  // 1. Initial Retrieval & Permission Filtering
  const initialCandidates = documents.filter(doc => 
    doc.department === 'all' || doc.department === role || role === 'admin'
  );

  if (!useHybridSearch) {
    return initialCandidates.sort((a, b) => b.uploadDate - a.uploadDate);
  }

  // 2. Reranking Step
  const scoredDocs = initialCandidates.map(doc => ({
    doc,
    score: calculateRelevanceScore(doc, query)
  }));

  scoredDocs.sort((a, b) => b.score - a.score);
  console.log("Reranked Documents:", scoredDocs.map(d => `${d.doc.name}: ${d.score.toFixed(1)}`));

  // 3. Thresholding
  const relevantDocs = scoredDocs
    .filter(item => item.score > 0)
    .map(item => item.doc);

  if (relevantDocs.length === 0) {
    return initialCandidates;
  }

  return relevantDocs;
};

/**
 * Call OpenAI Compatible API (OneAPI, Qwen, vLLM, etc.)
 */
const callOpenAICompatible = async (
    modelSettings: ModelSettings,
    systemInstruction: string,
    query: string,
    images: { mimeType: string; data: string }[], // Base64 images
    onStream: (text: string) => void
): Promise<string> => {
    
    // Format messages for OpenAI API
    const messages = [
        { role: 'system', content: systemInstruction },
        {
            role: 'user',
            content: [
                { type: 'text', text: query },
                ...images.map(img => ({
                    type: 'image_url',
                    image_url: {
                        url: `data:${img.mimeType};base64,${img.data}`
                    }
                }))
            ]
        }
    ];

    try {
        const response = await fetch(`${modelSettings.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${modelSettings.apiKey}`
            },
            body: JSON.stringify({
                model: modelSettings.modelName,
                messages: messages,
                stream: true,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenAI API Error: ${response.status} ${errText}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(trimmed.slice(6));
                            const content = data.choices[0]?.delta?.content || '';
                            if (content) {
                                fullText += content;
                                onStream(fullText);
                            }
                        } catch (e) {
                            // Ignore parse errors from partial chunks
                        }
                    }
                }
            }
        }
        return fullText;

    } catch (e) {
        console.error("OpenAI/OneAPI Call Failed:", e);
        throw e;
    }
};

export const generateRAGResponse = async (
  query: string,
  history: Message[],
  documents: Document[],
  role: string,
  useHybridSearch: boolean,
  language: Language,
  modelSettings: ModelSettings,
  onPromptDebug: (prompt: string) => void,
  onStream: (text: string) => void
): Promise<string> => {
  
  // 1. Retrieve relevant context with enhanced reranking
  const contextDocs = retrieveDocuments(query, documents, role, useHybridSearch);
  
  // 2. Construct Context
  let contextString = "KNOWLEDGE BASE CONTEXT:\n";
  const imageParts: { mimeType: string; data: string }[] = [];

  contextDocs.forEach(doc => {
    if (doc.type.startsWith('image/')) {
        // Collect images for multimodal request
        imageParts.push({
            mimeType: doc.type,
            data: doc.content
        });
        contextString += `\n--- START IMAGE: ${doc.name} ---\n(Image content provided above)\n--- END IMAGE: ${doc.name} ---\n`;
    } else {
        // Text files
        contextString += `\n--- START DOCUMENT: ${doc.name} ---\n`;
        contextString += doc.content.substring(0, 20000); 
        contextString += `\n--- END DOCUMENT: ${doc.name} ---\n`;
    }
  });

  if (contextDocs.length === 0) {
    contextString += "No accessible documents found in the knowledge base for your department.\n";
  }

  const systemInstruction = `
You are an intelligent enterprise knowledge assistant. 
Your goal is to answer user questions STRICTLY based on the provided KNOWLEDGE BASE CONTEXT.

RULES:
1. Use the provided context to answer. If the answer isn't in the context, say "I cannot find that information in the knowledge base."
2. ${useHybridSearch ? 'Use "Hybrid Search" logic: Pay close attention to specific product codes, versions, or exact keyword matches in the documents.' : 'Focus on semantic understanding of the documents.'}
3. CITATIONS: You MUST cite your sources. When you use information from a document, append [Source: filename] to the end of the sentence or paragraph.
4. If the user asks about an image, describe the image context provided.
5. FORMATTING: Use Markdown to structure your answer. Use bolding for key terms, bullet points for lists, and headers for sections to ensure readability. Avoid long walls of text.
6. Keep answers professional and concise.
7. LANGUAGE: The user interface is currently in ${language === 'zh' ? 'Chinese (Simplified)' : 'English'}. Please reply to the user in ${language === 'zh' ? 'Chinese (Simplified)' : 'English'}, unless the user explicitly asks for another language.

${contextString}
`;

  // Capture full prompt for debug
  const debugPrompt = `=== SYSTEM INSTRUCTION (Includes Retrieved Context) ===\n${systemInstruction}\n\n=== USER INPUT ===\n${query}${imageParts.length > 0 ? `\n\n[Attached ${imageParts.length} Images]` : ''}`;
  onPromptDebug(debugPrompt);

  try {
    // 3. Dispatch to selected provider
    if (modelSettings.provider === 'openai') {
        return await callOpenAICompatible(modelSettings, systemInstruction, query, imageParts, onStream);
    } else {
        // Default: Gemini
        const geminiParts: any[] = imageParts.map(img => ({
            inlineData: { mimeType: img.mimeType, data: img.data }
        }));
        geminiParts.push({ text: query });

        const modelName = modelSettings.modelName || DEFAULT_GEMINI_MODEL;
        const responseStream = await ai.models.generateContentStream({
          model: modelName,
          contents: [{ role: 'user', parts: geminiParts }],
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.3,
          }
        });

        let fullText = '';
        for await (const chunk of responseStream) {
          const text = chunk.text || ''; 
          fullText += text;
          onStream(fullText);
        }
        return fullText;
    }

  } catch (error) {
    console.error("LLM Service Error:", error);
    const msg = language === 'zh' 
        ? "调用大模型失败。请检查系统设置中的模型配置（API Key / Base URL）。" 
        : "Failed to call LLM. Please check your Model Settings (API Key / Base URL).";
    onStream(msg);
    return msg;
  }
};