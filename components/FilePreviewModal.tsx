import React from 'react';
import { X, Copy, FileText, Image as ImageIcon, Calendar } from 'lucide-react';
import { Document, Language } from '../types';
import { translations } from '../utils/i18n';

interface FilePreviewModalProps {
  document: Document;
  onClose: () => void;
  language: Language;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ document: doc, onClose, language }) => {
  if (!doc) return null;
  const t = translations[language].modal;

  const handleCopy = () => {
    navigator.clipboard.writeText(doc.content);
  };

  const isImage = doc.type.startsWith('image/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
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
            {!isImage && (
                <button 
                    onClick={handleCopy}
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

        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-50/50 p-6">
           {isImage ? (
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
           )}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;