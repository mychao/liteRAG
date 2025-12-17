import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, File, Trash2, CheckCircle, Loader2, XCircle, Image as ImageIcon, FileType, Eye, ChevronRight, ChevronDown, ChevronLeft } from 'lucide-react';
import { Document, Role, Language } from '../types';
import { translations } from '../utils/i18n';
import { db } from '../services/db';
import { chunkDocument } from '../services/geminiService';

interface KnowledgeBaseProps {
  onRefreshDocs: () => void; // Parent trigger to update search index
  onViewDocument: (doc: Document) => void;
  language: Language;
}

const PAGE_SIZE = 10;

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ onRefreshDocs, onViewDocument, language }) => {
  const t = translations[language].knowledge;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Local UI State for Pagination & Data
  const [docs, setDocs] = useState<Document[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  
  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [uploadRole, setUploadRole] = useState<Role | 'all'>('all');
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  // Load Data on Mount & Page Change
  useEffect(() => {
      loadData(page);
  }, [page]);

  const loadData = async (pageNum: number) => {
      setLoading(true);
      try {
          const result = await db.getDocumentsPaginated(pageNum, PAGE_SIZE);
          setDocs(result.docs);
          setTotalDocs(result.total);
      } catch (e) {
          console.error("Failed to load docs", e);
      } finally {
          setLoading(false);
      }
  };

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    // Safety check: if the click came from an action button, do nothing
    // (Though stopPropagation in render should handle this)
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
        if (file.type.startsWith('image/')) {
            finalContent = content.split(',')[1];
        }
        resolve(finalContent);
      };
      reader.onerror = reject;
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
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
    setLoading(true);
    setProcessingStatus("Processing & Chunking...");

    const processedDocs: Document[] = [];

    for (const file of fileArray) {
      try {
        const content = await readFileContent(file);
        
        // Base Document
        const newDoc: Document = {
            id: Math.random().toString(36).substring(7),
            name: file.name,
            type: file.type || 'text/plain',
            content: content,
            department: uploadRole,
            uploadDate: Date.now(),
            status: 'ready'
        };

        // --- ENTERPRISE FEATURE: Pre-Chunking ---
        // Generate chunks immediately upon upload so retrieval is fast later.
        // We import the same logic used in the service.
        newDoc.chunks = chunkDocument(newDoc);
        
        processedDocs.push(newDoc);
      } catch (e) {
          console.error("Error reading file", file.name, e);
      }
    }

    if (processedDocs.length > 0) {
        // Save to DB
        await db.addDocuments(processedDocs);
        // Refresh Global Index
        onRefreshDocs();
        // Reset to page 1 to see new files
        setPage(1);
        loadData(1); 
    }
    
    setProcessingStatus(null);
    setLoading(false);
  };

  const deleteDocument = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    
    if (!window.confirm(t.confirmDelete)) return;
    
    setDeletingId(id);
    try {
        await db.deleteDocument(id);
        
        // Trigger global index refresh (Await it if possible, treating as promise)
        await onRefreshDocs();
        
        // Pagination logic: If this was the last item on the page, go back 1 page
        if (docs.length === 1 && page > 1) {
            setPage(p => p - 1);
        } else {
            loadData(page);
        }
    } catch (err) {
        console.error("Delete failed", err);
        alert('Failed to delete document');
    } finally {
        setDeletingId(null);
    }
  };

  const getIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="text-purple-500" size={20} />;
    return <FileType className="text-blue-500" size={20} />;
  };

  const totalPages = Math.ceil(totalDocs / PAGE_SIZE);

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

        {/* Document List with Pagination */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center shrink-0">
            <h3 className="font-semibold text-slate-800">{t.indexedDocs.replace('{count}', totalDocs.toString())}</h3>
            <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                {loading && <Loader2 size={12} className="animate-spin" />}
                {processingStatus ? processingStatus : 'IndexedDB + Chunking'}
            </span>
          </div>
          
          <div className="flex-1 overflow-auto">
            {totalDocs === 0 && !loading ? (
                <div className="p-8 text-center text-slate-400">
                <File size={48} className="mx-auto mb-3 opacity-20" />
                <p>{t.noDocs}</p>
                </div>
            ) : (
                <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10 shadow-sm">
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
                    {loading && docs.length === 0 ? (
                         <tr><td colSpan={6} className="p-10 text-center text-slate-400">Loading data...</td></tr>
                    ) : (
                        docs.map((doc) => (
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
                                {doc.chunks && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                                        {doc.chunks.length} chunks
                                    </span>
                                )}
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
                            </td>
                            <td 
                                className="px-6 py-4 text-right" 
                                onClick={(e) => {
                                    // CRITICAL: Stop propagation here to prevent row expand when clicking ANYWHERE in the action cell
                                    e.stopPropagation();
                                }}
                            >
                                <div className="flex items-center justify-end gap-2">
                                <button
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        onViewDocument(doc); 
                                    }}
                                    className="text-slate-400 hover:text-blue-500 transition-colors p-1"
                                    title="Preview Document"
                                >
                                    <Eye size={16} />
                                </button>
                                <button 
                                    onClick={(e) => deleteDocument(doc.id, e)}
                                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                    title="Delete Document"
                                    disabled={deletingId === doc.id}
                                >
                                    {deletingId === doc.id ? <Loader2 size={16} className="animate-spin text-red-500" /> : <Trash2 size={16} />}
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
                        ))
                    )}
                </tbody>
                </table>
            )}
          </div>
          
          {/* Pagination Footer */}
          {totalDocs > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500">
                    Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, totalDocs)} of {totalDocs} entries
                </span>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-medium text-slate-700">Page {page} of {totalPages}</span>
                    <button 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;