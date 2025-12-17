
import { GoogleGenAI } from "@google/genai";
import { Document, Message, Language, ModelSettings, Chunk } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

// --- Enterprise RAG Configuration ---
const TOP_K_CHUNKS = 15; // Increased K because chunks are smaller
const MAX_CONTEXT_CHARS = 80000; // Gemini 1.5 Flash supports huge context, we can be generous

// --- Advanced Search Engine State (Local Mode) ---
// Maps term -> { chunkId: frequency }
let invertedIndex: Record<string, Record<string, number>> = {}; 
// Maps chunkId -> Chunk Object
let chunkRegistry: Record<string, Chunk & { docName: string, docType: string, department: string, uploadDate: number }> = {}; 
// Maps docId -> Document norm (for TF-IDF normalization)
let docNorms: Record<string, number> = {}; 

let isIndexed = false;

/**
 * Enterprise Tokenizer
 * Handles mixed English/Chinese text better
 */
const tokenize = (text: string): string[] => {
    const normalized = text.toLowerCase();
    // Match CJK characters or English words
    const regex = /[\u4e00-\u9fa5]|[\w-]+/g;
    return normalized.match(regex) || [];
};

/**
 * Intelligent Chunking Strategy
 * Splits text into overlapping chunks to preserve context at boundaries.
 */
export const chunkDocument = (doc: Document): Chunk[] => {
    // If it's an image, treat as one chunk
    if (doc.type.startsWith('image/')) {
        return [{
            id: `${doc.id}-img`,
            docId: doc.id,
            content: doc.content, // Base64
            index: 0
        }];
    }

    const CHUNK_SIZE = 800;
    const OVERLAP = 100;
    const text = doc.content;
    const chunks: Chunk[] = [];
    
    let start = 0;
    let chunkIndex = 0;

    while (start < text.length) {
        let end = start + CHUNK_SIZE;
        
        // Try to break at a paragraph or sentence to be cleaner
        if (end < text.length) {
            const lastNewLine = text.lastIndexOf('\n', end);
            const lastPeriod = text.lastIndexOf('.', end);
            
            if (lastNewLine > start + CHUNK_SIZE / 2) {
                end = lastNewLine + 1;
            } else if (lastPeriod > start + CHUNK_SIZE / 2) {
                end = lastPeriod + 1;
            }
        }

        const chunkContent = text.substring(start, end).trim();
        
        if (chunkContent.length > 0) {
            chunks.push({
                id: `${doc.id}-c${chunkIndex}`,
                docId: doc.id,
                content: chunkContent,
                index: chunkIndex
            });
            chunkIndex++;
        }

        start = end - OVERLAP;
        // Prevent infinite loop if overlap is too aggressive relative to structure
        if (start >= text.length || start < 0) break;
    }

    return chunks;
};

/**
 * Builds a TF-IDF style Inverted Index on CHUNKS
 */
export const buildSearchIndex = (documents: Document[]) => {
    console.time("Indexing");
    invertedIndex = {};
    chunkRegistry = {};
    docNorms = {};
    
    let totalChunks = 0;

    documents.forEach(doc => {
        // Use existing chunks or generate them on the fly
        const chunks = doc.chunks && doc.chunks.length > 0 ? doc.chunks : chunkDocument(doc);
        
        chunks.forEach(chunk => {
            chunkRegistry[chunk.id] = {
                ...chunk,
                docName: doc.name,
                docType: doc.type,
                department: doc.department,
                uploadDate: doc.uploadDate
            };
            totalChunks++;

            // Indexing Text
            const textToIndex = `${doc.name} ${chunk.content}`;
            const tokens = tokenize(textToIndex);
            const termFreqs: Record<string, number> = {};

            // Calculate TF (Term Frequency)
            tokens.forEach(t => {
                termFreqs[t] = (termFreqs[t] || 0) + 1;
            });

            // Update Inverted Index
            Object.entries(termFreqs).forEach(([term, count]) => {
                if (!invertedIndex[term]) {
                    invertedIndex[term] = {};
                }
                invertedIndex[term][chunk.id] = count;
            });
        });
    });
    
    isIndexed = true;
    console.timeEnd("Indexing");
    console.log(`Enterprise Index Built: ${totalChunks} chunks from ${documents.length} docs.`);
};

/**
 * BM25-inspired Scoring Algorithm
 */
const calculateChunkScore = (
    queryTokens: string[], 
    chunkId: string, 
    chunkData: typeof chunkRegistry[string]
): number => {
    let score = 0;
    
    queryTokens.forEach(term => {
        const postings = invertedIndex[term];
        if (postings && postings[chunkId]) {
            // TF: How many times term appears in this chunk
            const tf = postings[chunkId]; 
            
            // IDF: Inverse Document Frequency (Simulated)
            // Rarer terms give higher scores
            const docFreq = Object.keys(postings).length;
            const idf = 1.0 / (Math.log(1 + docFreq) + 0.1);

            score += tf * idf;
        }
    });

    // Boost for Recency
    const daysSinceUpload = (Date.now() - chunkData.uploadDate) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 5 - daysSinceUpload * 0.1); 

    // Boost for Title Matches (Heuristic)
    queryTokens.forEach(term => {
        if (chunkData.docName.toLowerCase().includes(term)) {
            score += 2.0;
        }
    });

    return score;
};

/**
 * Retrieval Logic: Returns sorted CHUNKS instead of Documents
 */
const retrieveChunks = (query: string, role: string, useHybridSearch: boolean): any[] => {
    if (!isIndexed) return [];

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const chunkScores: Record<string, number> = {};
    const candidateChunks = new Set<string>();

    // 1. Recall Candidates (OR query)
    queryTokens.forEach(term => {
        const postings = invertedIndex[term];
        if (postings) {
            Object.keys(postings).forEach(chunkId => candidateChunks.add(chunkId));
        }
    });

    // 2. Score Candidates
    candidateChunks.forEach(chunkId => {
        const chunkData = chunkRegistry[chunkId];
        // Permission Check
        if (chunkData.department !== 'all' && chunkData.department !== role && role !== 'admin') {
            return;
        }
        
        chunkScores[chunkId] = calculateChunkScore(queryTokens, chunkId, chunkData);
    });

    // 3. Sort & Cut
    return Object.entries(chunkScores)
        .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
        .slice(0, TOP_K_CHUNKS)
        .map(([id, score]) => ({
            ...chunkRegistry[id],
            score
        }));
};

/**
 * Upload Document to Enterprise Backend
 */
export const uploadDocumentToServer = async (
    file: File, 
    department: string, 
    serverUrl: string
): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('department', department);

    try {
        const response = await fetch(`${serverUrl}/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        // The backend handles the indexing asynchronously
    } catch (e) {
        console.error("Server upload failed:", e);
        throw e;
    }
};

/**
 * Call Remote Enterprise Backend (Python FastAPI)
 */
const callEnterpriseBackend = async (
    query: string,
    role: string,
    language: Language,
    serverUrl: string,
    onPromptDebug: (prompt: string) => void,
    onStream: (text: string) => void
): Promise<string> => {
    onPromptDebug("Executing Remote RAG Pipeline on: " + serverUrl);
    
    try {
        const response = await fetch(`${serverUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                user_role: role,
                language: language
            })
        });

        if (!response.ok) {
            throw new Error(`Server Error: ${response.status} ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                // Simple stream decoding
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;
                onStream(fullText);
            }
        }
        return fullText;

    } catch (e) {
        console.error("Backend connection failed:", e);
        const errMsg = language === 'zh' 
            ? "无法连接到企业后端服务器，请检查 URL 配置或回退到本地模式。" 
            : "Cannot connect to Enterprise Backend. Please check URL in settings or switch to Local Mode.";
        onStream(errMsg);
        return errMsg;
    }
};


// ... callOpenAICompatible function remains same ...
const callOpenAICompatible = async (
    modelSettings: ModelSettings,
    systemInstruction: string,
    query: string,
    images: { mimeType: string; data: string }[],
    onStream: (text: string) => void
): Promise<string> => {
    const messages = [
        { role: 'system', content: systemInstruction },
        {
            role: 'user',
            content: [
                { type: 'text', text: query },
                ...images.map(img => ({
                    type: 'image_url',
                    image_url: { url: `data:${img.mimeType};base64,${img.data}` }
                }))
            ]
        }
    ];

    try {
        const response = await fetch(`${modelSettings.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${modelSettings.apiKey}` },
            body: JSON.stringify({ model: modelSettings.modelName, messages: messages, stream: true, temperature: 0.3 })
        });

        if (!response.ok) throw new Error(await response.text());

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
                            if (content) { fullText += content; onStream(fullText); }
                        } catch (e) {}
                    }
                }
            }
        }
        return fullText;
    } catch (e) {
        console.error("OpenAI Call Failed:", e);
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
  
  // --- BRANCH: Enterprise Server Mode ---
  if (modelSettings.useServer && modelSettings.serverUrl) {
      return callEnterpriseBackend(
          query,
          role,
          language,
          modelSettings.serverUrl,
          onPromptDebug,
          onStream
      );
  }

  // --- BRANCH: Local Browser Mode ---
  
  // Initialize Index if needed (Note: In production, this runs in a worker)
  if (!isIndexed || Object.keys(invertedIndex).length === 0) {
      buildSearchIndex(documents);
  }

  // 1. Retrieve RELEVANT CHUNKS (Not full docs)
  // This is the key difference: We get precise segments.
  const relevantChunks = retrieveChunks(query, role, useHybridSearch);
  
  // 2. Context Assembly
  let contextString = "KNOWLEDGE BASE CONTEXT:\n";
  const imageParts: { mimeType: string; data: string }[] = [];
  let currentContextLength = 0;

  // Group chunks by Document for cleaner display
  // But maintain rank order implicitly or sort by doc? 
  // Better to keep rank order so LLM sees most relevant info first.
  
  for (const chunk of relevantChunks) {
    let contentToAdd = "";
    
    if (chunk.docType.startsWith('image/')) {
        imageParts.push({ mimeType: chunk.docType, data: chunk.content });
        contentToAdd = `\n[Image: ${chunk.docName}]\n`;
    } else {
        contentToAdd = `\n--- SOURCE: ${chunk.docName} (Excerpt) ---\n${chunk.content}\n`;
    }

    if (currentContextLength + contentToAdd.length > MAX_CONTEXT_CHARS) break;

    contextString += contentToAdd;
    currentContextLength += contentToAdd.length;
  }

  if (relevantChunks.length === 0) {
    contextString += "No relevant information found in the knowledge base.\n";
  }

  const systemInstruction = `
You are an advanced enterprise knowledge assistant.
Answer the user's question using ONLY the provided context excerpts.

CONTEXT STRUCTURE:
The context consists of "Chunks" (excerpts) from various documents.
Each chunk is marked with "--- SOURCE: filename (Excerpt) ---".

RULES:
1. **Precision**: Use the specific details from the excerpts.
2. **Citations**: STRICTLY cite the source filename when using information. Format: [[Source: filename]].
3. **Honesty**: If the provided excerpts do not contain the answer, state that you don't have enough information. Do not hallucinate.
4. **Synthesis**: If multiple chunks discuss the same topic, synthesize the information into a coherent answer.
5. Language: Reply in ${language === 'zh' ? 'Chinese (Simplified)' : 'English'}.

${contextString}
`;

  const debugPrompt = `=== SYSTEM INSTRUCTION (Context Size: ${currentContextLength} chars) ===\n${systemInstruction}\n\n=== USER INPUT ===\n${query}`;
  onPromptDebug(debugPrompt);

  try {
    if (modelSettings.provider === 'openai') {
        return await callOpenAICompatible(modelSettings, systemInstruction, query, imageParts, onStream);
    } else {
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
        ? "服务暂时不可用。" 
        : "Service temporarily unavailable.";
    onStream(msg);
    return msg;
  }
};
