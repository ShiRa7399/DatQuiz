/**
 * Safe SessionStorage wrapper with in-memory fallback
 * Prevents DOMExceptions in Safari Private Browsing Mode & iOS WebKit
 */
const memoryStore = {};

export const safeStorage = {
  getItem(key) {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem(key);
      }
    } catch (e) {
      console.warn('sessionStorage access blocked by Safari/iOS:', e);
    }
    return memoryStore[key] || null;
  },

  setItem(key, value) {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn('sessionStorage setItem blocked by Safari/iOS:', e);
    }
    memoryStore[key] = String(value);
  },

  removeItem(key) {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('sessionStorage removeItem blocked:', e);
    }
    delete memoryStore[key];
  },

  clear() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.clear();
      }
    } catch (e) {
      console.warn('sessionStorage clear blocked:', e);
    }
    Object.keys(memoryStore).forEach(k => delete memoryStore[k]);
  }
};
