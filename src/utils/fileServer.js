// File server utility for handling uploaded files
// Uses Firebase Storage exclusively

import { fileOperations } from './fileOperations.js';

export const fileServer = {
  // Get the proper URL for a file (Firebase Storage or direct URL)
  async getFileUrl(file) {
    // Use fileOperations to get URL from Firebase Storage
    return fileOperations.getFileUrl(file);
  },

  // Get proper MIME type for file extension
  getMimeType(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeTypes = {
      'pdf': 'application/pdf',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      'txt': 'text/plain',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  },

  // Sanitize filename for download
  sanitizeFileName(fileName) {
    if (!fileName) return 'download';

    // Remove or replace invalid characters
    return fileName
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .trim();
  },





  // Handle file preview/viewing
  async handleFileView(file) {
    try {
      const url = await this.getFileUrl(file);
      if (!url) {
        return;
      }

      const fileExt = file.ext?.toLowerCase() || '';
      const isPpt = fileExt === 'ppt' || fileExt === 'pptx';
      const isPdf = fileExt === 'pdf';
      const isFirebaseUrl = url.includes('firebasestorage.googleapis.com') || url.includes('firebase');
      const isPublicUrl = url.startsWith('http://') || url.startsWith('https://');
      const isBlobUrl = url.startsWith('blob:');

      if (isPpt) {
        // For PPT/PPTX files:
        // - Try Office Online Viewer for public URLs (including Firebase download URLs)
        // - If that fails, download directly
        if (isPublicUrl && !isBlobUrl) {
          // Public URL (including Firebase Storage signed URLs) - try Office Online Viewer
          const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
          const viewerWindow = window.open(viewerUrl, '_blank', 'noopener,noreferrer');

          // If the window was blocked or failed, fallback to download
          if (!viewerWindow || viewerWindow.closed || typeof viewerWindow.closed === 'undefined') {
            await this.handleFileDownload(file);
          }
        } else {
          // Non-public URL or blob URL (legacy) - trigger download
          await this.handleFileDownload(file);
        }
      } else if (isPdf) {
        // PDF files can be viewed directly in browser
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        // Other file types - try to open directly
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      // Fallback to download if preview fails
      try {
        await this.handleFileDownload(file);
      } catch (downloadError) {
        // Silently handle download errors
      }
    }
  },

  // Download Firebase Storage files using CORS-safe methods
  async downloadFirebaseFile(url, fileName, showNotification = null) {
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
    const isPdf = fileExt === 'pdf';

    // Show initial notification
    if (showNotification) {
      showNotification(`Préparation du téléchargement de ${fileName}...`, 'info', 1500);
    }



    // For non-PDF files, use standard method
    try {
      const downloadUrl = new URL(url);
      downloadUrl.searchParams.set('response-content-disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      downloadUrl.searchParams.set('response-content-type', 'application/octet-stream');

      const link = document.createElement('a');
      link.href = downloadUrl.toString();
      link.download = fileName;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (showNotification) {
        showNotification(`Téléchargement de ${fileName} initié!`, 'success', 4000);
      }

    } catch (error) {
      window.open(url, '_blank', 'noopener,noreferrer');

      if (showNotification) {
        showNotification(`${fileName} ouvert dans un nouvel onglet`, 'info');
      }
    }
  },



  // Handle file download
  async handleFileDownload(file, showNotification = null) {
    try {
      const url = await this.getFileUrl(file);
      if (!url) {
        throw new Error('Unable to get file URL');
      }

      const fileName = this.sanitizeFileName(file.name || file.originalName || 'download');
      const isFirebaseUrl = url.includes('firebasestorage.googleapis.com') || url.includes('firebase') || url.includes('firebasestorage.app');
      const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
      const isPdf = fileExt === 'pdf';

      // Show download start notification
      if (showNotification) {
        showNotification(`Téléchargement de ${fileName} en cours...`, 'info', 2000);
      }

      // For Firebase Storage URLs, use direct download approach to avoid CORS
      if (isFirebaseUrl) {
        await this.downloadFirebaseFile(url, fileName, showNotification);
        return;
      }

      // For PDFs from other sources, use specialized download function
      if (isPdf) {
        await this.forcePdfDownload(url, fileName, showNotification);
        return;
      }

      // Additional safety check: if URL looks like Firebase but wasn't caught above
      if (url.includes('googleapis.com') || url.includes('firebasestorage')) {
        await this.downloadFirebaseFile(url, fileName, showNotification);
        return;
      }

      // For non-Firebase URLs, use CORS-safe download methods (no fetch)
      try {
        // Strategy 1: Direct download link
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (showNotification) {
          showNotification(`Téléchargement de ${fileName} initié...`, 'success');
        }
      } catch (error) {
        // Fallback: Open in new tab
        window.open(url, '_blank', 'noopener,noreferrer');

        if (showNotification) {
          showNotification(`${fileName} ouvert dans un nouvel onglet`, 'info');
        }
      }
    } catch (error) {
      // Show user-friendly error message
      const errorMessage = error.message.includes('Permission denied') || error.message.includes('unauthorized')
        ? 'Vous devez être connecté pour télécharger ce fichier.'
        : error.message.includes('Network')
          ? 'Erreur réseau: Vérifiez votre connexion internet.'
          : 'Erreur lors du téléchargement du fichier. Veuillez réessayer.';

      if (showNotification) {
        showNotification(errorMessage, 'error');
      } else {
        alert(errorMessage);
      }

      throw error;
    }
  },

};
