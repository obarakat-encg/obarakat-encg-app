/**
 * Simplified File Operations for R2 Storage
 * Works with Firebase Realtime Database + Cloudflare R2
 */

import { database } from '../firebase.js';
import { ref, get } from 'firebase/database';
import { dataCache } from './cache.js';

// Get public files for homepage preview
export const fileOperations = {
  async getPublicFiles(type) {
    const cacheKey = `public_files_${type}`;
    
    // Check cache first
    const cached = dataCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const files = [];
      
      // Get files from all years
      for (const year of ['year3', 'year4', 'year5']) {
        const yearRef = ref(database, `resources/${type}/${year}`);
        const snapshot = await get(yearRef);
        
        if (snapshot.exists()) {
          const modules = snapshot.val();
          
          // Iterate through modules
          for (const moduleName in modules) {
            const moduleData = modules[moduleName];
            
            // Get files from this module
            for (const fileId in moduleData) {
              const file = moduleData[fileId];
              
              // Only include actual files (not placeholders)
              if (file && file.id && file.type) {
                files.push({
                  id: file.id,
                  name: file.description || file.id,
                  url: file.url,
                  uploadedAt: file.created_at,
                  size: file.size || 0,
                  ext: file.file_type || 'file',
                  type: file.type,
                  module: moduleName,
                  year: year
                });
              }
            }
          }
        }
      }
      
      // Sort by date, newest first
      const sortedFiles = files.sort((a, b) => {
        const dateA = new Date(a.uploadedAt || 0);
        const dateB = new Date(b.uploadedAt || 0);
        return dateB - dateA;
      });
      
      // Cache for 5 minutes
      dataCache.set(cacheKey, sortedFiles, 300000);
      
      return sortedFiles;
    } catch (error) {
      console.error(`Error getting ${type} files:`, error);
      return [];
    }
  }
};

// Seminar operations (works with database directly)
export const seminarOperations = {
  async getSeminars() {
    const cacheKey = 'seminars_list';
    
    // Check cache first
    const cached = dataCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const seminarsRef = ref(database, 'seminar');
      const snapshot = await get(seminarsRef);

      if (!snapshot.exists()) {
        return [];
      }

      const data = snapshot.val();
      const seminars = [];

      for (const seminarId in data) {
        seminars.push({
          ...data[seminarId],
          id: seminarId
        });
      }

      // Sort by date
      const sortedSeminars = seminars.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Cache for 10 minutes
      dataCache.set(cacheKey, sortedSeminars, 600000);
      
      return sortedSeminars;
    } catch (error) {
      console.error('Error fetching seminars:', error);
      return [];
    }
  }
};
