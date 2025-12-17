import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FileText, Search, Loader2, Terminal, X, Copy, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message, Document, Role, Language, ModelSettings } from '../types';
import { generateRAGResponse } from '../services/geminiService';
import { translations } from '../utils/i18n';

interface ChatInterfaceProps {
  documents: Document[];
  currentRole: Role;
  useHybridSearch: boolean;
  onViewDocument: (doc: Document) => void;
  language: Language;
  modelSettings: ModelSettings;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  documents, 
  currentRole, 
  useHybridSearch, 
  onViewDocument, 
  language,
  modelSettings 
}) => {
  const t = translations[language].chat;
  
  // Re-initialize welcome message when language changes
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: t.initialMessage.replace('{count}', documents.length.toString()),
      timestamp: Date.now(),
    }
  ]);
  
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 'welcome') {
         setMessages([{
             ...messages[0],
             content: t.initialMessage.replace('{count}', documents.length.toString())
         }]);
    }
  }, [language, documents.length]);

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [retrievalStep, setRetrievalStep] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, retrievalStep]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    // Simulate RAG Steps visually
    setRetrievalStep(t.analyzing);
    await new Promise(r => setTimeout(r, 600));
    
    setRetrievalStep(t.searching.replace('{role}', currentRole));
    await new Promise(r => setTimeout(r, 800));
    
    if (useHybridSearch) {
        setRetrievalStep(t.hybridSearch);
        await new Promise(r => setTimeout(r, 600));
    }
    
    setRetrievalStep(t.reranking);
    await new Promise(r => setTimeout(r, 500));
    
    setRetrievalStep(t.synthesizing);

    // Create a placeholder bot message for streaming
    const botMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: botMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
      isThinking: true
    }]);

    try {
      await generateRAGResponse(
        userMessage.content,
        messages, 
        documents,
        currentRole,
        useHybridSearch,
        language,
        modelSettings,
        (debugPrompt) => {
             // Save the generated prompt to the message state
             setMessages(prev => prev.map(msg => 
                msg.id === botMsgId 
                  ? { ...msg, debugPrompt: debugPrompt }
                  : msg
              ));
        },
        (streamText) => {
          setMessages(prev => prev.map(msg => 
            msg.id === botMsgId 
              ? { ...msg, content: streamText, isThinking: false }
              : msg
          ));
        }
      );
    } catch (e) {
      setMessages(prev => prev.map(msg => 
        msg.id === botMsgId 
          ? { ...msg, content: t.error, isThinking: false }
          : msg
      ));
    } finally {
      setIsProcessing(false);
      setRetrievalStep(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Top Bar Info */}
      <div className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{t.context}</span>
          <span className="bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">
            {documents.filter(d => d.department === 'all' || d.department === currentRole).length} {t.docs}
          </span>
          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs border border-blue-100 uppercase">
            {currentRole} {t.access}
          </span>
          {useHybridSearch && (
            <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs border border-purple-100 flex items-center gap-1">
              <Search size={10} /> {t.hybrid}
            </span>
          )}
        </div>
        
        {/* Current Model Indicator */}
        <div className="text-xs text-slate-400 font-mono">
           {modelSettings.provider === 'gemini' ? 'Gemini' : 'OpenAI'} / {modelSettings.modelName}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-blue-600' : 'bg-emerald-600'
            }`}>
              {msg.role === 'user' ? <User className="text-white w-5 h-5" /> : <Bot className="text-white w-5 h-5" />}
            </div>
            
            <div className={`max-w-[80%] space-y-1 ${msg.role === 'user' ? 'items-end flex flex-col' : ''}`}>
              <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
              }`}>
                {msg.role === 'model' ? (
                  <div className="prose prose-sm max-w-none prose-slate 
                    prose-p:my-2 prose-p:leading-relaxed 
                    prose-headings:font-semibold prose-headings:text-slate-800 prose-headings:my-3 
                    prose-ul:my-2 prose-li:my-0.5
                    prose-strong:font-semibold prose-strong:text-slate-900
                    prose-pre:bg-slate-100 prose-pre:p-3 prose-pre:rounded-lg prose-pre:border prose-pre:border-slate-200">
                    <ReactMarkdown>
                      {/* Clean content to remove [Source: ...] tags for cleaner display */}
                      {msg.content.replace(/\[Source:.*?\]/g, '')}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
                
                {msg.isThinking && (
                  <span className="inline-block w-2 h-4 bg-slate-400 animate-pulse ml-1 align-middle"></span>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-1 w-full justify-between">
                {/* Citations highlighting (Clickable) */}
                {msg.role === 'model' && (
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                       // Extract source tags
                       const matches = msg.content.match(/\[Source:.*?\]/g) || [];
                       
                       // Process, split multiple files, and clean
                       const allFiles = matches.flatMap(tag => {
                           const content = tag.replace(/^\[Source:\s*/i, '').replace(/\]$/, '');
                           return content.split(/[,;]/).map(s => {
                               let clean = s.trim();
                               // Remove prefixes like "Image File:", "File:", etc.
                               clean = clean.replace(/^(Image\s+File:|File:|Image:|Document:)\s*/i, '');
                               // Remove quotes, markdown bold/italic, backticks
                               clean = clean.replace(/['"`*_]/g, '');
                               // Remove trailing dot if present (e.g. "file.jpg.")
                               clean = clean.replace(/\.$/, '');
                               return clean.trim();
                           });
                       });
                       
                       const uniqueFiles = Array.from(new Set(allFiles)).filter(f => f.length > 0);

                       return uniqueFiles.map((fileName, idx) => {
                        const doc = documents.find(d => d.name === fileName);
                        return (
                            <button 
                                key={idx} 
                                onClick={() => doc && onViewDocument(doc)}
                                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                                    doc 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:shadow-sm cursor-pointer' 
                                    : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                }`}
                                title={doc ? t.viewSource : t.docNotFound}
                                disabled={!doc}
                            >
                                {doc && doc.type.startsWith('image/') ? <ImageIcon size={12} /> : <FileText size={12} />}
                                <span className="max-w-[150px] truncate">{fileName}</span>
                            </button>
                        );
                       });
                    })()}
                  </div>
                )}
                
                {/* Debug Prompt Button */}
                {msg.role === 'model' && msg.debugPrompt && (
                    <button 
                        onClick={() => setActivePrompt(msg.debugPrompt || '')}
                        className="ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded border bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors shrink-0"
                        title={t.viewPrompt}
                    >
                        <Terminal size={10} />
                        <span className="hidden sm:inline">{t.viewPrompt}</span>
                    </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Retrieval Step Indicator */}
        {retrievalStep && (
            <div className="flex items-center gap-3 justify-center py-4">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-xs font-mono text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 animate-pulse">
                    {retrievalStep}
                </span>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.placeholder}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none h-[52px] text-sm"
            disabled={isProcessing}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">
          {t.disclaimer}
        </p>
      </div>

      {/* Full Prompt Debug Modal */}
      {activePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setActivePrompt(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <Terminal size={20} className="text-slate-500" />
                        <h3 className="text-lg font-bold text-slate-800">{t.promptDebugTitle}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={() => navigator.clipboard.writeText(activePrompt)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t.copyPrompt}
                        >
                            <Copy size={20} />
                        </button>
                        <button onClick={() => setActivePrompt(null)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-slate-900 p-6">
                    <pre className="font-mono text-xs text-green-400 whitespace-pre-wrap leading-relaxed">
                        {activePrompt}
                    </pre>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;