// File operations utility for new database structure
// Structure: resources/{type}/{year}/{module_name}/{resource_id}

import { firebaseStorage } from './firebaseStorage';
import { database, ref, set, get, push, remove, update } from '../firebase.js';
import { authService } from './auth.js';

// Module names by year (can be extended)
export const MODULES = {
  year3: [
    'Module gestion de produit et qualite',
    'module entrepreunariat et montage de projets',
    'autre ressources perdagogiques'
  ],
  year4: [
    'module cadrage et planification de projets',
    'autre ressources perdagogiques'
  ],
  year5: [
    'module comportement organisationnel',
    'autre ressources perdagogiques'
  ]
};

// Get all modules for a specific year
export function getModulesForYear(year) {
  return MODULES[year] || [];
}

// Get path for resources
function getResourcesPath(type, year, moduleName) {
  if (moduleName) {
    return `resources/${type}/${year}/${moduleName}`;
  }
  return `resources/${type}/${year}`;
}

function getResourcePath(type, year, moduleName, resourceId) {
  return `resources/${type}/${year}/${moduleName}/${resourceId}`;
}

export const fileOperations = {
  // Upload a file to Firebase Storage and store metadata
  async uploadFile(file, fileName, year, type, moduleName) {
    const userRole = localStorage.getItem('encg_user_role');
    if (!userRole || userRole !== 'admin') {
      throw new Error('Admin access required to upload files');
    }

    if (!moduleName) {
      throw new Error('Module name is required');
    }

    const fileExtension = file.name.split('.').pop().toLowerCase();
    const normalizedFileName = (() => {
      const trimmed = fileName.trim();
      if (!trimmed) return file.name;
      const lowerTrimmed = trimmed.toLowerCase();
      return lowerTrimmed.endsWith(`.${fileExtension}`)
        ? trimmed
        : `${trimmed}.${fileExtension}`;
    })();

    try {
      // Upload to Firebase Storage
      const uploadedFile = await firebaseStorage.uploadFile(file, normalizedFileName, year, type);

      // Generate unique resource ID
      const resourcesRef = ref(database, getResourcesPath(type, year, moduleName));
      const newResourceRef = push(resourcesRef);
      const resourceId = newResourceRef.key;

      // Create resource metadata with size as bytes (double/number)
      const sizeInBytes = Number(uploadedFile.size || file.size || 0);
      
      const resourceData = {
        id: resourceId,
        type: 'file',
        file_type: fileExtension,
        location: uploadedFile.firebasePath || uploadedFile.url,
        size: sizeInBytes, // Store as number (bytes)
        created_at: new Date().toISOString(),
        name: normalizedFileName
      };

      // Store in database
      const resourcePath = getResourcePath(type, year, moduleName, resourceId);
      await set(ref(database, resourcePath), resourceData);

      // Dispatch event for UI updates
      window.dispatchEvent(new CustomEvent('filesUpdated', {
        detail: { type, year, moduleName, resource: resourceData }
      }));

      return { ...resourceData, url: uploadedFile.url };
    } catch (error) {
      if (error.message?.includes('Permission denied') || error.code === 'PERMISSION_DENIED') {
        throw new Error('Permission denied: Check Firebase rules');
      }
      throw error;
    }
  },

  // Add a link resource
  async addLink(linkData, year, type, moduleName) {
    const userRole = localStorage.getItem('encg_user_role');
    if (!userRole || userRole !== 'admin') {
      throw new Error('Admin access required');
    }

    if (!moduleName) {
      throw new Error('Module name is required');
    }

    try {
      // Generate unique resource ID
      const resourcesRef = ref(database, getResourcesPath(type, year, moduleName));
      const newResourceRef = push(resourcesRef);
      const resourceId = newResourceRef.key;

      // Create resource metadata
      const resourceData = {
        id: resourceId,
        type: 'link',
        url: linkData.url,
        description: linkData.description || '',
        created_at: new Date().toISOString()
      };

      // Store in database
      const resourcePath = getResourcePath(type, year, moduleName, resourceId);
      await set(ref(database, resourcePath), resourceData);

      // Dispatch event for UI updates
      window.dispatchEvent(new CustomEvent('filesUpdated', {
        detail: { type, year, moduleName, resource: resourceData }
      }));

      return resourceData;
    } catch (error) {
      throw error;
    }
  },

  // Delete a resource
  async deleteResource(resourceId, year, type, moduleName) {
    const userRole = localStorage.getItem('encg_user_role');
    if (!userRole || userRole !== 'admin') {
      throw new Error('Admin access required');
    }

    try {
      // Get resource data
      const resourcePath = getResourcePath(type, year, moduleName, resourceId);
      const resourceRef = ref(database, resourcePath);
      const snapshot = await get(resourceRef);

      if (!snapshot.exists()) {
        throw new Error('Resource not found');
      }

      const resourceData = snapshot.val();

      // If it's a file, delete from storage
      if (resourceData.type === 'file' && resourceData.location) {
        try {
          await firebaseStorage.deleteFile({ firebasePath: resourceData.location });
        } catch (storageError) {
          console.warn('Storage delete failed:', storageError);
        }
      }

      // Remove from database
      await remove(resourceRef);

      // Dispatch event for UI updates
      window.dispatchEvent(new CustomEvent('filesUpdated', {
        detail: { type, year, moduleName, resourceId }
      }));

      return { success: true };
    } catch (error) {
      throw error;
    }
  },

  // Get all resources for a type (across all years and modules)
  async getFiles(type) {
    try {
      const resourcesRef = ref(database, `resources/${type}`);
      const snapshot = await get(resourcesRef);

      if (!snapshot.exists()) {
        return [];
      }

      const data = snapshot.val();
      const files = [];

      // Iterate through years
      for (const year in data) {
        const yearData = data[year];
        
        // Iterate through modules
        for (const moduleName in yearData) {
          const moduleData = yearData[moduleName];
          
          // Iterate through resources
          for (const resourceId in moduleData) {
            const resource = moduleData[resourceId];
            
            // Parse size - handle both string formats and numeric bytes
            let sizeInBytes = 0;
            if (resource.size) {
              if (typeof resource.size === 'string') {
                // Try to parse string formats like "5.2 MB"
                const match = resource.size.match(/([\d.]+)\s*(B|KB|MB|GB)/i);
                if (match) {
                  const value = parseFloat(match[1]);
                  const unit = match[2].toUpperCase();
                  const multipliers = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
                  sizeInBytes = value * (multipliers[unit] || 1);
                }
              } else {
                sizeInBytes = Number(resource.size);
              }
            }
            
            files.push({
              ...resource,
              year: year,
              module: moduleName,
              // For compatibility with existing UI
              name: resource.name || resource.description || 'Resource',
              url: resource.type === 'link' ? resource.url : resource.location,
              uploadedAt: resource.created_at,
              ext: resource.file_type || 'link',
              size: sizeInBytes // Ensure size is always a number
            });
          }
        }
      }

      return files;
    } catch (error) {
      console.error('Error fetching files:', error);
      return [];
    }
  },

  // Get files for a specific year
  async getFilesByYear(type, year) {
    try {
      const yearRef = ref(database, `resources/${type}/${year}`);
      const snapshot = await get(yearRef);

      if (!snapshot.exists()) {
        return [];
      }

      const data = snapshot.val();
      const files = [];

      // Iterate through modules
      for (const moduleName in data) {
        const moduleData = data[moduleName];
        
        // Iterate through resources
        for (const resourceId in moduleData) {
          const resource = moduleData[resourceId];
          
          files.push({
            ...resource,
            year: year,
            module: moduleName,
            name: resource.name || resource.description || 'Resource',
            url: resource.type === 'link' ? resource.url : resource.location,
            uploadedAt: resource.created_at,
            ext: resource.file_type || 'link'
          });
        }
      }

      return files;
    } catch (error) {
      console.error('Error fetching files by year:', error);
      return [];
    }
  },

  // Get files for a specific module
  async getFilesByModule(type, year, moduleName) {
    try {
      const moduleRef = ref(database, getResourcesPath(type, year, moduleName));
      const snapshot = await get(moduleRef);

      if (!snapshot.exists()) {
        return [];
      }

      const data = snapshot.val();
      const files = [];

      // Iterate through resources
      for (const resourceId in data) {
        const resource = data[resourceId];
        
        // Parse size - handle both string formats and numeric bytes
        let sizeInBytes = 0;
        if (resource.size) {
          if (typeof resource.size === 'string') {
            const match = resource.size.match(/([\d.]+)\s*(B|KB|MB|GB)/i);
            if (match) {
              const value = parseFloat(match[1]);
              const unit = match[2].toUpperCase();
              const multipliers = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
              sizeInBytes = value * (multipliers[unit] || 1);
            }
          } else {
            sizeInBytes = Number(resource.size);
          }
        }
        
        files.push({
          ...resource,
          year: year,
          module: moduleName,
          name: resource.name || resource.description || 'Resource',
          url: resource.type === 'link' ? resource.url : resource.location,
          uploadedAt: resource.created_at,
          ext: resource.file_type || 'link',
          size: sizeInBytes
        });
      }

      return files;
    } catch (error) {
      console.error('Error fetching files by module:', error);
      return [];
    }
  },

  // Get files for public consumption (used by cours.jsx and td.jsx)
  async getPublicFiles(type) {
    return await this.getFiles(type);
  },

  // Get file URL from Firebase Storage
  async getFileUrl(file) {
    try {
      if (file.type === 'link') {
        return file.url;
      }
      return await firebaseStorage.getFileUrl(file);
    } catch (error) {
      return file.url || file.location || null;
    }
  }
};

// Seminar operations (now at root level)
export const seminarOperations = {
  // Get all seminars
  async getSeminars() {
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
      return seminars.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.error('Error fetching seminars:', error);
      return [];
    }
  },

  // Add a seminar
  async addSeminar(seminarData) {
    const userRole = localStorage.getItem('encg_user_role');
    if (!userRole || userRole !== 'admin') {
      throw new Error('Admin access required');
    }

    try {
      const seminarsRef = ref(database, 'seminar');
      const newSeminarRef = push(seminarsRef);
      const seminarId = newSeminarRef.key;

      const seminar = {
        ...seminarData,
        id: seminarId
      };

      await set(newSeminarRef, seminar);
      return seminar;
    } catch (error) {
      throw error;
    }
  },

  // Update a seminar
  async updateSeminar(seminarId, seminarData) {
    const userRole = localStorage.getItem('encg_user_role');
    if (!userRole || userRole !== 'admin') {
      throw new Error('Admin access required');
    }

    try {
      const seminarRef = ref(database, `seminar/${seminarId}`);
      await update(seminarRef, seminarData);
      return { ...seminarData, id: seminarId };
    } catch (error) {
      throw error;
    }
  },

  // Delete a seminar
  async deleteSeminar(seminarId) {
    const userRole = localStorage.getItem('encg_user_role');
    if (!userRole || userRole !== 'admin') {
      throw new Error('Admin access required');
    }

    try {
      const seminarRef = ref(database, `seminar/${seminarId}`);
      await remove(seminarRef);
      return { success: true };
    } catch (error) {
      throw error;
    }
  }
};
