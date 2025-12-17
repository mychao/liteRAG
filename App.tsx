import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import KnowledgeBase from './components/KnowledgeBase';
import Settings from './components/Settings';
import FilePreviewModal from './components/FilePreviewModal';
import { Document, Role, Language, ModelSettings } from './types';

// Mock initial data
const initialDocs: Document[] = [
    {
        id: '1',
        name: 'Employee_Handbook_2024.md',
        type: 'text/markdown',
        department: 'all',
        content: `
# Employee Handbook 2024
## 1. Work Hours
Standard work hours are 9:00 AM to 5:00 PM.

## 2. Remote Work Policy
Employees are allowed 2 days of remote work per week.
        `,
        uploadDate: Date.now(),
        status: 'ready'
    },
    {
        id: '2',
        name: 'Project_Titan_Specs.txt',
        type: 'text/plain',
        department: 'rnd',
        content: `
CONFIDENTIAL - R&D DEPARTMENT ONLY
Project Titan Technical Specifications:
- Codename: X-2024-V1
- Battery Capacity: 5000mAh
- Chipset: A17 Pro Mock
- Release Target: Q4 2024
        `,
        uploadDate: Date.now(),
        status: 'ready'
    },
    {
        id: '3',
        name: 'Salary_Bands_2024.txt',
        type: 'text/plain',
        department: 'hr',
        content: `
HR CONFIDENTIAL
Salary Bands for 2024:
- Junior Engineer: $80k - $100k
- Senior Engineer: $120k - $160k
- Staff Engineer: $170k+
        `,
        uploadDate: Date.now(),
        status: 'ready'
    }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge' | 'settings'>('chat');
  
  // App State
  const [documents, setDocuments] = useState<Document[]>(initialDocs);
  const [currentRole, setCurrentRole] = useState<Role>('admin');
  const [useHybridSearch, setUseHybridSearch] = useState<boolean>(true);
  const [language, setLanguage] = useState<Language>('en');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  // Model Settings State
  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    provider: 'gemini',
    modelName: 'gemini-2.5-flash',
    baseUrl: '',
    apiKey: ''
  });

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
                documents={documents} 
                setDocuments={setDocuments} 
                onViewDocument={setSelectedDoc}
                language={language}
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