// File statistics utility for calculating total files and sizes
import { fileOperations } from './fileOperations.js';

export const fileStats = {
  // Calculate total statistics for all files
  async getTotalStats() {
    try {
      const [coursFiles, tdFiles] = await Promise.all([
        fileOperations.getFiles('cours'),
        fileOperations.getFiles('td')
      ]);

      const allFiles = [...coursFiles, ...tdFiles];

      const totalFiles = allFiles.length;
      const totalSize = allFiles.reduce((sum, file) => sum + (file.size || 0), 0);

      const coursCount = coursFiles.length;
      const tdCount = tdFiles.length;

      const coursSize = coursFiles.reduce((sum, file) => sum + (file.size || 0), 0);
      const tdSize = tdFiles.reduce((sum, file) => sum + (file.size || 0), 0);

      return {
        total: {
          files: totalFiles,
          size: totalSize
        },
        cours: {
          files: coursCount,
          size: coursSize
        },
        td: {
          files: tdCount,
          size: tdSize
        }
      };
    } catch (error) {
      return {
        total: { files: 0, size: 0 },
        cours: { files: 0, size: 0 },
        td: { files: 0, size: 0 }
      };
    }
  },

  // Format file size in human readable format
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Format file count with proper pluralization
  formatFileCount(count) {
    return count === 0 ? 'Aucun fichier' :
      count === 1 ? '1 fichier' :
        `${count} fichiers`;
  }
};