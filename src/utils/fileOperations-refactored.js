// File operations utility for admin dashboard
// NEW SCHEMA: Uses /resources/[type]/[year]/[module_name]/[PUSH_KEY] structure

import { firebaseStorage } from './firebaseStorage';
import { database, ref, set, get, push, remove } from '../firebase.js';
import { authService } from './auth.js';

/**
 * Get the resources path based on type
 * NEW SCHEMA:
 * - Seminars: /resources/seminar/[PUSH_KEY]
 * - Cours: /resources/cours/[year]/[module_name]/[PUSH_KEY]
 * - TD: /resources/td/[year]/[module_name]/[PUSH_KEY]
 */
function getResourcesPath(type, year = null, moduleName = null) {
  if (type === 'seminar') {
    return 'resources/seminar';
  } else if (type === 'cours' || type === 'td') {
    if (!year || !moduleName) {
      throw new Error(`Year and module name are required for ${type}`);
    }
    return `resources/${type}/${year}/${moduleName}`;
  }
  throw new Error(`Invalid resource type: ${type}`);
}

/**
 * Transform Firebase snapshot to array with push keys as IDs
 * REQUIRED LOGIC: Iterate over push keys and assign as 'id' field
 */
function transformSnapshotToArray(snapshot) {
  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  const result = [];

  // Iterate over Firebase push keys
  for (const pushKey in data) {
    result.push({
      id: pushKey, // Assign push key as ID
      ...data[pushKey]
    });
  }

  return result;
}

/**
 * Get all resources of a specific type
 * NEW SCHEMA: Handles different path structures for different resource types
 */
async function getAllResources(type) {
  try {
    const allResources = [];

    if (type === 'seminar') {
      // Seminars: /resources/seminar/[PUSH_KEY]
      const seminarRef = ref(database, 'resources/seminar');
      const snapshot = await get(seminarRef);
      const seminars = transformSnapshotToArray(snapshot);
      allResources.push(...seminars);
    } else if (type === 'cours' || type === 'td') {
      // Cours/TD: /resources/[type]/[year]/[module_name]/[PUSH_KEY]
      const typeRef = ref(database, `resources/${type}`);
      const typeSnapshot = await get(typeRef);

      if (typeSnapshot.exists()) {
        const yearsData = typeSnapshot.val();

        // Iterate through years
        for (const year in yearsData) {
          const modulesData = yearsData[year];

          // Iterate through modules
          for (const moduleName in modulesData) {
            const resourcesData = modulesData[moduleName];

            // Transform resources with push keys as IDs
            for (const pushKey in resourcesData) {
              allResources.push({
                id: pushKey,
                year: year,
                module: moduleName,
                ...resourcesData[pushKey]
              });
            }
          }
        }
      }
    }

    return allResources;
  } catch (error) {
    console.error(`Error getting ${type} resources:`, error);
    throw error;
  }
}

export const fileOperations = {
  /**
   * Upload a file to Firebase Storage and store metadata in RTDB
   * NEW SCHEMA: Stores at appropriate path with push key
   */
  async uploadFile(file, fileName, year, type, moduleName = 'general') {
    const userRole = localStorage.getItem('encg_user_role');
    if (!userRole) {
      throw new Error('Authentication required to upload files');
    }

    if (userRole !== 'admin') {
      throw new Error('Admin access required to upload files');
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

      // Store metadata in RTDB using NEW SCHEMA
      try {
        let resourcePath;
        if (type === 'seminar') {
          resourcePath = 'resources/seminar';
        } else {
          resourcePath = `resources/${type}/${year}/${moduleName}`;
        }

        const resourceRef = ref(database, resourcePath);
        const newResourceKey = push(resourceRef).key;

        const metadata = {
          name: uploadedFile.name,
          url: uploadedFile.url,
          size: uploadedFile.size,
          uploadedAt: uploadedFile.uploadedAt,
          year: year,
          ext: uploadedFile.ext,
          type: type,
          module: moduleName,
          firebasePath: uploadedFile.firebasePath
        };

        await set(ref(database, `${resourcePath}/${newResourceKey}`), metadata);

        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('filesUpdated', {
          detail: { type, file: { ...metadata, id: newResourceKey } }
        }));

        return { ...metadata, id: newResourceKey };
      } catch (dbError) {
        console.warn('Failed to update RTDB metadata:', dbError);
        return uploadedFile;
      }
    } catch (error) {
      if (error.message?.includes('Permission denied') || error.code === 'PERMISSION_DENIED') {
        throw new Error('Permission denied: Make sure you are authenticated as admin');
      }
      throw error;
    }
  },

  /**
   * Delete a file from Firebase Storage and RTDB
   * NEW SCHEMA: Removes from appropriate path using push key
   */
  async deleteFile(fileId, year, type, moduleName = 'general') {
    const userRole = localStorage.getItem('encg_user_role');
    if (!userRole) {
      throw new Error('Authentication required to delete files');
    }

    if (userRole !== 'admin') {
      throw new Error('Admin access required to delete files');
    }

    try {
      // Get file metadata
      let resourcePath;
      if (type === 'seminar') {
        resourcePath = `resources/seminar/${fileId}`;
      } else {
        resourcePath = `resources/${type}/${year}/${moduleName}/${fileId}`;
      }

      const fileRef = ref(database, resourcePath);
      const snapshot = await get(fileRef);

      if (!snapshot.exists()) {
        throw new Error('File not found');
      }

      const fileData = snapshot.val();

      // Delete from Firebase Storage
      try {
        await firebaseStorage.deleteFile(fileData);
      } catch (storageError) {
        console.warn('Storage delete failed:', storageError);
      }

      // Remove from RTDB
      await remove(fileRef);

      // Dispatch event for UI updates
      window.dispatchEvent(new CustomEvent('filesUpdated', {
        detail: { type, file: { ...fileData, id: fileId } }
      }));

      return { success: true };
    } catch (error) {
      if (error.message?.includes('Permission denied') || error.code === 'PERMISSION_DENIED') {
        throw new Error('Permission denied: Make sure you are authenticated as admin');
      }
      throw error;
    }
  },

  /**
   * Get files list from Firebase RTDB
   * NEW SCHEMA: Reads from new path structure and transforms data
   */
  async getFiles(type) {
    const userRole = authService.userRole || localStorage.getItem('encg_user_role');

    // For non-authenticated users, fallback to JSON
    if (!userRole) {
      try {
        const response = await fetch(`/${type}/index.json`);
        if (response.ok) {
          return await response.json();
        }
      } catch (fetchError) {
        // Silently handle
      }
      return [];
    }

    try {
      // Get all resources using NEW SCHEMA
      const resources = await getAllResources(type);
      return resources;
    } catch (error) {
      console.error('Error getting files:', error);

      // Fallback to static JSON
      try {
        const response = await fetch(`/${type}/index.json`);
        if (response.ok) {
          return await response.json();
        }
      } catch (fetchError) {
        // Silently handle
      }

      return [];
    }
  },

  /**
   * Get files for public consumption (used by cours.jsx and td.jsx)
   * NEW SCHEMA: Works with new path structure
   */
  async getPublicFiles(type) {
    const userRole = authService.userRole || localStorage.getItem('encg_user_role');

    if (userRole) {
      try {
        return await this.getFiles(type);
      } catch (error) {
        console.warn('Failed to get files from Firebase:', error);
      }
    }

    // Fallback to static JSON
    try {
      const response = await fetch(`/${type}/index.json`);
      if (response.ok) {
        return await response.json();
      }
    } catch (fetchError) {
      // Silently handle
    }

    return [];
  },

  /**
   * Get file URL from Firebase Storage
   */
  async getFileUrl(file) {
    try {
      return await firebaseStorage.getFileUrl(file);
    } catch (error) {
      console.error('Get file URL error:', error);
      return file.url || null;
    }
  },

  /**
   * Helper function to get resources by year and module
   * NEW SCHEMA: Specific to cours/td structure
   */
  async getResourcesByYearAndModule(type, year, moduleName) {
    try {
      if (type === 'seminar') {
        throw new Error('Seminars do not have year/module structure');
      }

      const resourcePath = `resources/${type}/${year}/${moduleName}`;
      const resourceRef = ref(database, resourcePath);
      const snapshot = await get(resourceRef);

      return transformSnapshotToArray(snapshot);
    } catch (error) {
      console.error('Error getting resources by year and module:', error);
      return [];
    }
  }
};
