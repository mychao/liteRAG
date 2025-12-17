
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import KnowledgeBase from './components/KnowledgeBase';
import Settings from './components/Settings';
import FilePreviewModal from './components/FilePreviewModal';
import { Document, Role, Language, ModelSettings } from './types';
import { buildSearchIndex } from './services/geminiService';
import { db } from './services/db';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge' | 'settings'>('chat');
  
  // App State - We now only hold a subset or full set depending on need.
  // For RAG Search, we need ALL text content for the index (loaded once).
  // For KnowledgeBase UI, we use pagination via the component.
  const [documents, setDocuments] = useState<Document[]>([]); // This holds ALL docs for SEARCH INDEX only
  
  const [currentRole, setCurrentRole] = useState<Role>('admin');
  const [useHybridSearch, setUseHybridSearch] = useState<boolean>(true);
  const [language, setLanguage] = useState<Language>('en');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  // Model Settings State
  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    provider: 'gemini',
    modelName: 'gemini-2.5-flash',
    baseUrl: '',
    apiKey: '',
    useServer: false,
    serverUrl: 'http://localhost:8000'
  });

  // 1. Initialize DB and Load Data
  useEffect(() => {
    const initApp = async () => {
        try {
            await db.init();
            
            // Load Settings
            const savedSettings = await db.getSettings();
            if (savedSettings) {
                setCurrentRole(savedSettings.currentRole);
                setUseHybridSearch(savedSettings.useHybridSearch);
                setLanguage(savedSettings.language);
                if (savedSettings.modelSettings) {
                    // Merge in case of new fields
                    setModelSettings(prev => ({ ...prev, ...savedSettings.modelSettings }));
                }
            }

            // Load ALL documents for the Search Engine (In-Memory Index)
            // In a real microservice, this would be handled by the backend vector DB.
            // For this frontend-only "Enterprise" demo, we load them into memory.
            const allDocs = await db.getAllDocuments();
            setDocuments(allDocs);
            
            // Build the index immediately
            buildSearchIndex(allDocs);
            
        } catch (e) {
            console.error("Failed to initialize app:", e);
        } finally {
            setIsInitializing(false);
        }
    };
    
    initApp();
  }, []);

  // 2. Persist Settings changes
  useEffect(() => {
    if (!isInitializing) {
        db.saveSettings({
            currentRole,
            useHybridSearch,
            language,
            modelSettings
        });
    }
  }, [currentRole, useHybridSearch, language, modelSettings, isInitializing]);

  // 3. Callback to refresh documents (e.g. after upload/delete)
  const refreshDocuments = useCallback(async () => {
      const allDocs = await db.getAllDocuments();
      setDocuments(allDocs);
      buildSearchIndex(allDocs);
  }, []);

  if (isInitializing) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-slate-500 gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="font-medium">Initializing Enterprise Core...</span>
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        language={language}
        setLanguage={setLanguage}
      />
      
      <main className="flex-1 h-full overflow-hidden relative">
        {activeTab === 'chat' && (
            <ChatInterface 
                documents={documents} 
                currentRole={currentRole}
                useHybridSearch={useHybridSearch}
                onViewDocument={setSelectedDoc}
                language={language}
                modelSettings={modelSettings}
            />
        )}
        
        {activeTab === 'knowledge' && (
            <KnowledgeBase 
                onRefreshDocs={refreshDocuments} // Pass refresh trigger
                onViewDocument={setSelectedDoc}
                language={language}
                modelSettings={modelSettings}
            />
        )}
        
        {activeTab === 'settings' && (
            <Settings 
                currentRole={currentRole}
                setCurrentRole={setCurrentRole}
                useHybridSearch={useHybridSearch}
                setUseHybridSearch={setUseHybridSearch}
                language={language}
                modelSettings={modelSettings}
                setModelSettings={setModelSettings}
            />
        )}
      </main>

      {/* Global Preview Modal */}
      {selectedDoc && (
        <FilePreviewModal 
            document={selectedDoc} 
            onClose={() => setSelectedDoc(null)} 
            language={language}
        />
      )}
    </div>
  );
};

export default App;
