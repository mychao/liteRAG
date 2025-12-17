
import React from 'react';
import { Sliders, Shield, RefreshCw, Cpu, Globe, Key, Box, Server, Laptop } from 'lucide-react';
import { Role, Language, ModelSettings, ModelProvider } from '../types';
import { translations } from '../utils/i18n';

interface SettingsProps {
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  useHybridSearch: boolean;
  setUseHybridSearch: (use: boolean) => void;
  language: Language;
  modelSettings: ModelSettings;
  setModelSettings: (settings: ModelSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  currentRole, 
  setCurrentRole, 
  useHybridSearch, 
  setUseHybridSearch,
  language,
  modelSettings,
  setModelSettings
}) => {
  const t = translations[language].settings;

  const handleModelChange = (key: keyof ModelSettings, value: any) => {
    setModelSettings({ ...modelSettings, [key]: value });
  };

  return (
    <div className="h-full bg-slate-50 p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-8 pb-12">
        <div>
            <h2 className="text-2xl font-bold text-slate-900">{t.title}</h2>
            <p className="text-slate-500 mt-1">{t.subtitle}</p>
        </div>

        {/* Architecture Mode Selection */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                    <Server size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">{t.archConfig}</h3>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <button
                            onClick={() => handleModelChange('useServer', false)}
                            className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 ${
                                !modelSettings.useServer 
                                ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' 
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <Laptop size={20} />
                            {t.archLocal}
                        </button>
                        <button
                            onClick={() => handleModelChange('useServer', true)}
                            className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 ${
                                modelSettings.useServer 
                                ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' 
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <Server size={20} />
                            {t.archServer}
                        </button>
                    </div>

                    {modelSettings.useServer && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                <Globe size={14} /> {t.serverUrl}
                            </label>
                            <input 
                                type="text"
                                value={modelSettings.serverUrl}
                                onChange={(e) => handleModelChange('serverUrl', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                placeholder={t.serverPlaceholder}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Permission Simulation */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                    <Shield size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{t.roleSim}</h3>
                    <p className="text-slate-600 text-sm mb-4">
                        {t.roleDesc}
                    </p>
                    
                    <div className="grid grid-cols-3 gap-3">
                        {(['admin', 'hr', 'rnd'] as Role[]).map((role) => (
                            <button
                                key={role}
                                onClick={() => setCurrentRole(role)}
                                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                                    currentRole === role 
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500' 
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <span className="uppercase">{role}</span> {t.roleUser.replace('{role}', '')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Model Configuration */}
        <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 ${modelSettings.useServer ? 'opacity-60 pointer-events-none grayscale' : ''}`}>
            <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                    <Cpu size={24} />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                         <h3 className="text-lg font-semibold text-slate-900">{t.modelConfig}</h3>
                         {modelSettings.useServer && <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">Managed by Server</span>}
                    </div>
                   
                    
                    <div className="space-y-4">
                        {/* Provider Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.provider}</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleModelChange('provider', 'gemini')}
                                    className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                        modelSettings.provider === 'gemini' 
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' 
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    Google Gemini
                                </button>
                                <button
                                    onClick={() => handleModelChange('provider', 'openai')}
                                    className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                        modelSettings.provider === 'openai' 
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' 
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    OpenAI / OneAPI
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                {modelSettings.provider === 'gemini' ? t.geminiInfo : t.openaiInfo}
                            </p>
                        </div>

                        {/* Common: Model Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                <Box size={14} /> {t.modelName}
                            </label>
                            <input 
                                type="text"
                                value={modelSettings.modelName}
                                onChange={(e) => handleModelChange('modelName', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                placeholder={modelSettings.provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o, qwen-turbo...'}
                            />
                        </div>

                        {/* OpenAI Specific: Base URL and API Key */}
                        {modelSettings.provider === 'openai' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                        <Globe size={14} /> {t.baseUrl}
                                    </label>
                                    <input 
                                        type="text"
                                        value={modelSettings.baseUrl}
                                        onChange={(e) => handleModelChange('baseUrl', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        placeholder={t.placeholderUrl}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                        <Key size={14} /> {t.apiKey}
                                    </label>
                                    <input 
                                        type="password"
                                        value={modelSettings.apiKey}
                                        onChange={(e) => handleModelChange('apiKey', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        placeholder={t.placeholderKey}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Retrieval Strategy */}
        <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 ${modelSettings.useServer ? 'opacity-60 pointer-events-none grayscale' : ''}`}>
            <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                    <RefreshCw size={24} />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">{t.hybridTitle}</h3>
                        <button
                            onClick={() => setUseHybridSearch(!useHybridSearch)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                                useHybridSearch ? 'bg-purple-600' : 'bg-slate-200'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    useHybridSearch ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                    <p className="text-slate-600 text-sm">
                        {t.hybridDesc}
                    </p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
