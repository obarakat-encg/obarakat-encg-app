/**
 * Simple in-memory cache with TTL (Time To Live)
 * Reduces redundant Firebase requests
 */

class Cache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
  }

  set(key, value, ttl = 300000) { // Default 5 minutes
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now() + ttl);
  }

  get(key) {
    const timestamp = this.timestamps.get(key);
    
    if (!timestamp || Date.now() > timestamp) {
      // Cache expired
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear(key) {
    if (key) {
      this.cache.delete(key);
      this.timestamps.delete(key);
    } else {
      this.cache.clear();
      this.timestamps.clear();
    }
  }

  clearPattern(pattern) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        this.timestamps.delete(key);
      }
    }
  }
}

export const dataCache = new Cache();
