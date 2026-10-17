"use client";

const DB_NAME = 'tradr-game-db';
const DB_VERSION = 1;
const GAME_STATE_STORE = 'gameStates';
const GAME_HISTORY_STORE = 'gameHistory';
const CACHED_DATA_STORE = 'cachedData';

interface GameState {
  id: string;
  timestamp: number;
  state: any;
}

interface GameHistory {
  id: string;
  timestamp: number;
  score: number;
  symbol: string;
  result: any;
}

interface CachedData {
  key: string;
  timestamp: number;
  data: any;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(GAME_STATE_STORE)) {
          const stateStore = db.createObjectStore(GAME_STATE_STORE, { keyPath: 'id' });
          stateStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(GAME_HISTORY_STORE)) {
          const historyStore = db.createObjectStore(GAME_HISTORY_STORE, { keyPath: 'id' });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(CACHED_DATA_STORE)) {
          const dataStore = db.createObjectStore(CACHED_DATA_STORE, { keyPath: 'key' });
          dataStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  async saveGameState(id: string, state: any): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([GAME_STATE_STORE], 'readwrite');
      const store = transaction.objectStore(GAME_STATE_STORE);
      const request = store.put({
        id,
        timestamp: Date.now(),
        state
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getGameState(id: string): Promise<any | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([GAME_STATE_STORE], 'readonly');
      const store = transaction.objectStore(GAME_STATE_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result as GameState | undefined;
        resolve(result ? result.state : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteGameState(id: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([GAME_STATE_STORE], 'readwrite');
      const store = transaction.objectStore(GAME_STATE_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveGameHistory(history: Omit<GameHistory, 'id'>): Promise<string> {
    const db = await this.initDB();
    const id = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([GAME_HISTORY_STORE], 'readwrite');
      const store = transaction.objectStore(GAME_HISTORY_STORE);
      const request = store.put({
        id,
        ...history
      });

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getGameHistory(limit: number = 50): Promise<GameHistory[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([GAME_HISTORY_STORE], 'readonly');
      const store = transaction.objectStore(GAME_HISTORY_STORE);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      
      const results: GameHistory[] = [];
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async cacheData(key: string, data: any): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHED_DATA_STORE], 'readwrite');
      const store = transaction.objectStore(CACHED_DATA_STORE);
      const request = store.put({
        key,
        timestamp: Date.now(),
        data
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedData(key: string): Promise<any | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHED_DATA_STORE], 'readonly');
      const store = transaction.objectStore(CACHED_DATA_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as CachedData | undefined;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearOldData(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const db = await this.initDB();
    const cutoff = Date.now() - maxAge;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [GAME_STATE_STORE, GAME_HISTORY_STORE, CACHED_DATA_STORE],
        'readwrite'
      );

      const stores = [
        transaction.objectStore(GAME_STATE_STORE),
        transaction.objectStore(GAME_HISTORY_STORE),
        transaction.objectStore(CACHED_DATA_STORE)
      ];

      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed === stores.length) {
          resolve();
        }
      };

      stores.forEach(store => {
        const index = store.index('timestamp');
        const range = IDBKeyRange.upperBound(cutoff);
        const request = index.openCursor(range);

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            checkComplete();
          }
        };

        request.onerror = () => reject(request.error);
      });
    });
  }

  async exportData(): Promise<any> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [GAME_STATE_STORE, GAME_HISTORY_STORE, CACHED_DATA_STORE],
        'readonly'
      );

      const result: any = {
        gameStates: [],
        gameHistory: [],
        cachedData: []
      };

      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed === 3) {
          resolve(result);
        }
      };

      const stateStore = transaction.objectStore(GAME_STATE_STORE);
      stateStore.getAll().onsuccess = (e: any) => {
        result.gameStates = e.target.result;
        checkComplete();
      };

      const historyStore = transaction.objectStore(GAME_HISTORY_STORE);
      historyStore.getAll().onsuccess = (e: any) => {
        result.gameHistory = e.target.result;
        checkComplete();
      };

      const dataStore = transaction.objectStore(CACHED_DATA_STORE);
      dataStore.getAll().onsuccess = (e: any) => {
        result.cachedData = e.target.result;
        checkComplete();
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();
