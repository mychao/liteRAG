import React, { useState } from 'react';
import { X, Copy, FileText, Image as ImageIcon, Calendar, Layers, AlignLeft } from 'lucide-react';
import { Document, Language } from '../types';
import { translations } from '../utils/i18n';

interface FilePreviewModalProps {
  document: Document;
  onClose: () => void;
  language: Language;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ document: doc, onClose, language }) => {
  const [activeTab, setActiveTab] = useState<'content' | 'chunks'>('content');
  
  if (!doc) return null;
  const t = translations[language].modal;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const isImage = doc.type.startsWith('image/');
  const chunks = doc.chunks || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-4 pb-0 border-b border-slate-100 bg-white sticky top-0 z-10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-xl border shadow-sm ${isImage ? 'bg-purple-50 border-purple-100 text-purple-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                  {isImage ? <ImageIcon size={24} /> : <FileText size={24} />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 leading-tight">{doc.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wide">
                      {doc.type.split('/')[1] || 'FILE'}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar size={12} />
                      <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                    </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isImage && activeTab === 'content' && (
                  <button 
                      onClick={() => handleCopy(doc.content)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title={t.copy}
                  >
                      <Copy size={20} />
                  </button>
              )}
              <button 
                  onClick={onClose} 
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title={t.close}
              >
                  <X size={24} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 -mb-[1px]">
             <button 
                onClick={() => setActiveTab('content')}
                className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 ${
                    activeTab === 'content' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
             >
                <AlignLeft size={16} />
                {t.tabContent}
             </button>
             <button 
                onClick={() => setActiveTab('chunks')}
                className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 ${
                    activeTab === 'chunks' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
             >
                <Layers size={16} />
                {t.tabChunks}
                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px] border border-slate-200">
                    {chunks.length}
                </span>
             </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-slate-50/50 p-6">
           {activeTab === 'content' ? (
               // --- Original Content View ---
               isImage ? (
                  <div className="flex items-center justify-center min-h-full">
                    <img
                      src={`data:${doc.type};base64,${doc.content}`}
                      alt={doc.name}
                      className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg border border-slate-200 bg-white"
                    />
                  </div>
               ) : (
                  <div className="max-w-none prose prose-slate prose-sm mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200 min-h-full">
                     <pre className="!bg-transparent !p-0 !m-0 !shadow-none font-mono text-sm text-slate-800 whitespace-pre-wrap break-words">
                       {doc.content}
                     </pre>
                  </div>
               )
           ) : (
               // --- Chunks View ---
               <div className="max-w-3xl mx-auto space-y-4">
                 {chunks.length === 0 ? (
                     <div className="text-center py-12 text-slate-400">
                         <Layers size={48} className="mx-auto mb-3 opacity-20" />
                         <p>{t.noChunks}</p>
                     </div>
                 ) : (
                     chunks.map((chunk, idx) => (
                         <div key={chunk.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                             <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                     <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                         #{idx + 1}
                                     </span>
                                     <span className="text-xs font-mono text-slate-400">{chunk.id}</span>
                                 </div>
                                 <div className="flex items-center gap-2 text-xs text-slate-400">
                                     <span>{chunk.content.length} {t.chars}</span>
                                     {!isImage && (
                                         <button 
                                            onClick={() => handleCopy(chunk.content)}
                                            className="hover:text-blue-500 transition-colors"
                                            title="Copy Chunk"
                                         >
                                             <Copy size={12} />
                                         </button>
                                     )}
                                 </div>
                             </div>
                             <div className="p-4">
                                {isImage ? (
                                    <div className="text-xs text-slate-400 italic flex items-center gap-2">
                                        <ImageIcon size={14} />
                                        [Image Chunk Data - Base64 Hidden]
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
                                        {chunk.content}
                                    </p>
                                )}
                             </div>
                         </div>
                     ))
                 )}
               </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;