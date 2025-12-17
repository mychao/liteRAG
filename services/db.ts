import { Document, ModelSettings, Role, Language } from '../types';

const DB_NAME = 'LiteRAG_Enterprise_DB';
const DB_VERSION = 1;

// Seed data for first-time load
const SEED_DOCS: Document[] = [
    {
        id: 'seed-1',
        name: 'Employee_Handbook_2024.md',
        type: 'text/markdown',
        department: 'all',
        content: `# Employee Handbook 2024\n## 1. Work Hours\nStandard work hours are 9:00 AM to 5:00 PM.\n\n## 2. Remote Work Policy\nEmployees are allowed 2 days of remote work per week.`,
        uploadDate: Date.now(),
        status: 'ready'
    },
    {
        id: 'seed-2',
        name: 'Project_Titan_Specs.txt',
        type: 'text/plain',
        department: 'rnd',
        content: `CONFIDENTIAL - R&D DEPARTMENT ONLY\nProject Titan Technical Specifications:\n- Codename: X-2024-V1\n- Battery Capacity: 5000mAh\n- Chipset: A17 Pro Mock\n- Release Target: Q4 2024`,
        uploadDate: Date.now(),
        status: 'ready'
    },
    {
        id: 'seed-3',
        name: 'Salary_Bands_2024.txt',
        type: 'text/plain',
        department: 'hr',
        content: `HR CONFIDENTIAL\nSalary Bands for 2024:\n- Junior Engineer: $80k - $100k\n- Senior Engineer: $120k - $160k\n- Staff Engineer: $170k+`,
        uploadDate: Date.now(),
        status: 'ready'
    }
];

class DBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("IndexedDB error:", request.error);
        reject(request.error);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Documents Store
        if (!db.objectStoreNames.contains('documents')) {
          const docStore = db.createObjectStore('documents', { keyPath: 'id' });
          docStore.createIndex('uploadDate', 'uploadDate', { unique: false });
          docStore.createIndex('department', 'department', { unique: false });
        }

        // Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      };

      request.onsuccess = async (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        // Check if empty, if so, seed data
        const count = await this.getDocCount();
        if (count === 0) {
            await this.addDocuments(SEED_DOCS);
        }
        resolve();
      };
    });
  }

  // --- Document Operations ---

  async addDocuments(docs: Document[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');

      docs.forEach(doc => store.put(doc));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getAllDocuments(): Promise<Document[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getDocumentsPaginated(page: number, limit: number): Promise<{ docs: Document[], total: number }> {
    return new Promise((resolve, reject) => {
        if (!this.db) return reject("DB not initialized");
        const transaction = this.db.transaction(['documents'], 'readonly');
        const store = transaction.objectStore('documents');
        const index = store.index('uploadDate'); // Sort by date
        
        const countRequest = store.count();
        let total = 0;

        countRequest.onsuccess = () => {
            total = countRequest.result;
            if (total === 0) {
                resolve({ docs: [], total: 0 });
                return;
            }

            const docs: Document[] = [];
            // Use cursor to skip and limit (Efficient for IndexedDB)
            let advanced = false;
            // Iterate backwards (newest first)
            const cursorRequest = index.openCursor(null, 'prev'); 
            const skip = (page - 1) * limit;

            cursorRequest.onsuccess = (e) => {
                const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
                if (!cursor) {
                    resolve({ docs, total });
                    return;
                }

                if (skip > 0 && !advanced) {
                    advanced = true;
                    // Note: advance() can throw if skip > remaining
                    // Safe guard: usually we just do manual skip if advance is tricky in some browsers, but standard is:
                    if (skip < total) {
                        cursor.advance(skip);
                        return;
                    }
                }

                docs.push(cursor.value);
                if (docs.length < limit) {
                    cursor.continue();
                } else {
                    resolve({ docs, total });
                }
            };
        };
        countRequest.onerror = () => reject(countRequest.error);
    });
  }

  async deleteDocument(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');
      store.delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getDocCount(): Promise<number> {
      return new Promise((resolve, reject) => {
        if (!this.db) return reject("DB not initialized");
        const transaction = this.db.transaction(['documents'], 'readonly');
        const store = transaction.objectStore('documents');
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
  }

  // --- Settings Operations ---

  async saveSettings(settings: { 
      currentRole: Role, 
      useHybridSearch: boolean, 
      language: Language,
      modelSettings: ModelSettings 
  }): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!this.db) return reject("DB not initialized");
        const transaction = this.db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        store.put({ id: 'app_settings', ...settings });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
  }

  async getSettings(): Promise<any> {
    return new Promise((resolve, reject) => {
        if (!this.db) return reject("DB not initialized");
        const transaction = this.db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const request = store.get('app_settings');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
  }
}

export const db = new DBService();
