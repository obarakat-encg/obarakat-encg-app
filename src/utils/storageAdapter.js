const STORAGE_PREFIX = 'encg_file_content_';
const DB_NAME = 'encg_file_storage';
const STORE_NAME = 'files';

let dbPromise = null;

function isQuotaExceeded(error) {
  if (!error) return false;
  if (error.code && error.code === 22) return true;
  if (error.name && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) return true;
  return false;
}

function openDatabase() {
  if (dbPromise !== null) {
    return dbPromise;
  }

  if (typeof indexedDB === 'undefined') {
    dbPromise = Promise.resolve(null);
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });

  return dbPromise;
}

async function saveToIndexedDb(id, content) {
  const db = await openDatabase();
  if (!db) {
    throw new Error('IndexedDBUnavailable');
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(content, id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDBTransactionFailed'));
    request.onerror = () => reject(request.error || new Error('IndexedDBWriteFailed'));
  });
}

async function getFromIndexedDb(id) {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('IndexedDBReadFailed'));
  });
}

async function deleteFromIndexedDb(id) {
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDBTransactionFailed'));
    request.onerror = () => reject(request.error || new Error('IndexedDBDeleteFailed'));
  });
}

export const storageAdapter = {
  async saveFileContent(id, content) {
    const storageKey = `${STORAGE_PREFIX}${id}`;

    try {
      localStorage.setItem(storageKey, content);
      return { location: 'localStorage' };
    } catch (error) {
      if (!isQuotaExceeded(error)) {
        throw error;
      }

      try {
        await saveToIndexedDb(id, content);
        return { location: 'indexedDB' };
      } catch (indexedDbError) {
        const compositeError = new Error('StorageQuotaExceeded');
        compositeError.cause = indexedDbError;
        throw compositeError;
      }
    }
  },

  async getFileContent(id) {
    const storageKey = `${STORAGE_PREFIX}${id}`;
    const localValue = localStorage.getItem(storageKey);
    if (localValue !== null) {
      return localValue;
    }

    try {
      return await getFromIndexedDb(id);
    } catch (error) {
      return null;
    }
  },

  async removeFileContent(id) {
    const storageKey = `${STORAGE_PREFIX}${id}`;
    localStorage.removeItem(storageKey);

    try {
      await deleteFromIndexedDb(id);
    } catch (error) {
      // Silently handle deletion errors
    }
  }
};


