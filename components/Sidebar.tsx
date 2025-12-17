import React from 'react';
import { Database, MessageSquare, Settings, BookOpen, Languages } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/i18n';

interface SidebarProps {
  activeTab: 'chat' | 'knowledge' | 'settings';
  setActiveTab: (tab: 'chat' | 'knowledge' | 'settings') => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, language, setLanguage }) => {
  const t = translations[language].sidebar;

  const menuItems = [
    { id: 'chat', label: t.chat, icon: MessageSquare },
    { id: 'knowledge', label: t.knowledge, icon: Database },
    { id: 'settings', label: t.settings, icon: Settings },
  ] as const;

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 shrink-0 transition-all duration-300">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <BookOpen className="text-white w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-white tracking-tight">LiteRAG</h1>
          <p className="text-xs text-slate-500">{t.subtitle}</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 text-sm font-medium ${
              activeTab === item.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-4">
        <button 
            onClick={toggleLanguage}
            className="w-full flex items-center gap-2 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
        >
            <Languages size={14} />
            <span>{language === 'en' ? 'Switch to 中文' : '切换到 English'}</span>
        </button>

        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">System Status</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-medium text-green-400">{t.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;