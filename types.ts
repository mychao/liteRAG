export type Role = 'admin' | 'hr' | 'rnd';
export type Language = 'en' | 'zh';

export type ModelProvider = 'gemini' | 'openai';

export interface ModelSettings {
  provider: ModelProvider;
  modelName: string;
  baseUrl: string;
  apiKey: string;
}

export interface Chunk {
  id: string;
  docId: string;
  content: string;
  index: number;
}

export interface Document {
  id: string;
  name: string;
  type: string; // 'text/plain', 'image/png', etc.
  content: string; // Text content or Base64 for images
  chunks?: Chunk[]; // Added: Pre-computed chunks for granular retrieval
  department: Role | 'all';
  uploadDate: number;
  status: 'processing' | 'ready' | 'error';
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isThinking?: boolean;
  citations?: string[];
  debugPrompt?: string;
}

export interface AppState {
  documents: Document[];
  currentRole: Role;
  useHybridSearch: boolean;
  language: Language;
  modelSettings: ModelSettings;
}