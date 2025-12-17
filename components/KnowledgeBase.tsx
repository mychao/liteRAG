import React, { useRef, useState } from 'react';
import { UploadCloud, File, Trash2, CheckCircle, Loader2, XCircle, Image as ImageIcon, FileType, Eye, ChevronRight, ChevronDown } from 'lucide-react';
import { Document, Role, Language } from '../types';
import { translations } from '../utils/i18n';

interface KnowledgeBaseProps {
  documents: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  onViewDocument: (doc: Document) => void;
  language: Language;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ documents, setDocuments, onViewDocument, language }) => {
  const t = translations[language].knowledge;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadRole, setUploadRole] = useState<Role | 'all'>('all'); // Default role for new uploads
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedDocId(prev => prev === id ? null : id);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        let finalContent = content;
        // Remove data URL prefix if it's an image to get pure base64
        if (file.type.startsWith('image/')) {
            finalContent = content.split(',')[1];
        }
        resolve(finalContent);
      };
      reader.onerror = reject;

      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file); // Read as Base64 for Gemini
      } else {
        reader.readAsText(file); // Read as Text
      }
    });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files);
    
    // 1. Create placeholders with 'processing' status
    const newDocs: Document[] = fileArray.map(file => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      type: file.type || 'text/plain',
      content: '', // Empty initially
      department: uploadRole, 
      uploadDate: Date.now(),
      status: 'processing'
    }));
    
    setDocuments(prev => [...prev, ...newDocs]);

    // 2. Process each file
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const docId = newDocs[i].id;

      try {
        // Simulate ETL Processing Delay (Embedding generation, etc.)
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

        const content = await readFileContent(file);
        
        // Update to Ready
        setDocuments(prev => prev.map(d => 
          d.id === docId ? { ...d, content, status: 'ready' } : d
        ));
      } catch (error) {
        console.error("File processing error:", error);
        // Update to Error
        setDocuments(prev => prev.map(d => 
          d.id === docId ? { ...d, status: 'error' } : d
        ));
      }
    }
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const getIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="text-purple-500" size={20} />;
    return <FileType className="text-blue-500" size={20} />;
  };

  return (
    <div className="h-full bg-slate-50 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t.title}</h2>
          <p className="text-slate-500 mt-1">{t.subtitle}</p>
        </div>

        {/* Upload Area */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <div className="flex items-center justify-between mb-4">
               <h3 className="font-semibold text-slate-800">{t.addNew}</h3>
               <div className="flex items-center gap-2">
                   <span className="text-sm text-slate-600">{t.assignDept}</span>
                   <select 
                        value={uploadRole} 
                        onChange={(e) => setUploadRole(e.target.value as Role | 'all')}
                        className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                   >
                       <option value="all">{t.general}</option>
                       <option value="hr">{t.hr}</option>
                       <option value="rnd">{t.rnd}</option>
                       <option value="admin">{t.admin}</option>
                   </select>
               </div>
           </div>

          <div
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleChange}
              accept=".txt,.md,.json,.csv,.png,.jpg,.jpeg"
            />
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <UploadCloud size={32} />
            </div>
            <p className="text-lg font-medium text-slate-700">{t.dragDrop}</p>
            <p className="text-sm text-slate-500 mt-1">{t.supported}</p>
          </div>
        </div>

        {/* Document List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">{t.indexedDocs.replace('{count}', documents.length.toString())}</h3>
            <span className="text-xs text-slate-500 font-mono">{t.dbStatus}</span>
          </div>
          
          {documents.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <File size={48} className="mx-auto mb-3 opacity-20" />
              <p>{t.noDocs}</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-6 py-3">{t.colName}</th>
                  <th className="px-6 py-3">{t.colType}</th>
                  <th className="px-6 py-3">{t.colDept}</th>
                  <th className="px-6 py-3">{t.colStatus}</th>
                  <th className="px-6 py-3 text-right">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <React.Fragment key={doc.id}>
                    <tr 
                        className={`hover:bg-slate-50 group transition-colors cursor-pointer ${expandedDocId === doc.id ? 'bg-slate-50' : ''}`}
                        onClick={(e) => toggleExpand(e, doc.id)}
                    >
                      <td className="px-4 py-4 text-center">
                         <button className="text-slate-400 hover:text-blue-500">
                           {expandedDocId === doc.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                         </button>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700 flex items-center gap-3">
                        {getIcon(doc.type)}
                        {doc.name}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{doc.type.split('/')[1] || 'unknown'}</td>
                      <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium uppercase
                              ${doc.department === 'hr' ? 'bg-pink-100 text-pink-700' : 
                                doc.department === 'rnd' ? 'bg-indigo-100 text-indigo-700' : 
                                doc.department === 'admin' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                              {doc.department === 'all' ? 'General' : doc.department}
                          </span>
                      </td>
                      <td className="px-6 py-4">
                        {doc.status === 'ready' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <CheckCircle size={14} /> {t.ready}
                          </span>
                        )}
                        {doc.status === 'processing' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            <Loader2 size={14} className="animate-spin" /> {t.processing}
                          </span>
                        )}
                        {doc.status === 'error' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                            <XCircle size={14} /> {t.error}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onViewDocument(doc)}
                            className="text-slate-400 hover:text-blue-500 transition-colors p-1"
                            title="Preview Document"
                            disabled={doc.status !== 'ready'}
                          >
                            <Eye size={16} className={doc.status !== 'ready' ? 'opacity-50' : ''} />
                          </button>
                          <button 
                            onClick={() => deleteDocument(doc.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            title="Delete Document"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedDocId === doc.id && (
                        <tr className="bg-slate-50/50 animate-in fade-in duration-200">
                            <td colSpan={6} className="px-6 pb-6 pt-0 border-b border-slate-100">
                                <div className="ml-10 mt-2 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                   <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.preview}</h4>
                                        <span className="text-xs text-slate-400">ID: {doc.id}</span>
                                   </div>
                                   {doc.type.startsWith('image/') ? (
                                       <div className="relative h-48 w-full flex items-center justify-center bg-slate-100 rounded border border-slate-200 overflow-hidden">
                                           <img 
                                               src={`data:${doc.type};base64,${doc.content}`} 
                                               alt="Preview" 
                                               className="h-full object-contain" 
                                           />
                                       </div>
                                   ) : (
                                       <div className="font-mono text-xs text-slate-600 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto bg-slate-50 p-3 rounded border border-slate-100">
                                           {doc.content.slice(0, 500)}
                                           {doc.content.length > 500 && <span className="text-slate-400 italic block mt-2">{t.truncated}</span>}
                                       </div>
                                   )}
                                </div>
                            </td>
                        </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;