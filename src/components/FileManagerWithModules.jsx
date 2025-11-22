import React, { useState, useEffect } from "react";
import { ref, get, set, push } from "firebase/database";
import { database } from "../firebase";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../firebase";
import { FaUpload, FaTrash, FaFile, FaDownload, FaPlus, FaTimes, FaSpinner, FaLink } from "react-icons/fa";
import { useNotification } from "./NotificationContext";
import "./styles/FileManager.css";

const FileManagerWithModules = ({ type, title, onFileChange }) => {
  const [modules, setModules] = useState([]);
  const [resources, setResources] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedYear, setSelectedYear] = useState("year3");
  const [selectedModule, setSelectedModule] = useState("");
  const [uploadType, setUploadType] = useState("file");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadFileName, setUploadFileName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkDescription, setLinkDescription] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showSuccess, showError } = useNotification();

  const years = [
    { id: "year3", label: "3ème année" },
    { id: "year4", label: "4ème année" },
    { id: "year5", label: "5ème année" }
  ];

  useEffect(() => {
    loadModules();
  }, [selectedYear, type]);

  useEffect(() => {
    if (selectedModule) {
      loadResources();
    } else {
      setResources([]);
    }
  }, [selectedModule, selectedYear, type]);

  const loadModules = async () => {
    setLoading(true);
    try {
      const modulesRef = ref(database, `resources/${type}/${selectedYear}`);
      const snapshot = await get(modulesRef);
      
      if (snapshot.exists()) {
        const moduleNames = Object.keys(snapshot.val()).filter(key => key !== "_placeholder");
        setModules(moduleNames);
        if (moduleNames.length > 0 && !selectedModule) {
          setSelectedModule(moduleNames[0]);
        }
      } else {
        setModules([]);
        setSelectedModule("");
      }
    } catch (error) {
      showError("Erreur lors du chargement des modules");
    } finally {
      setLoading(false);
    }
  };

  const loadResources = async () => {
    if (!selectedModule) return;
    
    try {
      const resourcesRef = ref(database, `resources/${type}/${selectedYear}/${selectedModule}`);
      const snapshot = await get(resourcesRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const resourcesList = Object.entries(data)
          .filter(([key]) => key !== "_placeholder")
          .map(([key, value]) => ({ ...value, key }));
        setResources(resourcesList);
      } else {
        setResources([]);
      }
    } catch (error) {
      showError("Erreur lors du chargement des ressources");
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    if (uploadType === "file" && (!uploadFile || !uploadFileName.trim())) {
      showError("Veuillez sélectionner un fichier et entrer un nom");
      return;
    }
    
    if (uploadType === "link" && (!linkUrl.trim() || !linkDescription.trim())) {
      showError("Veuillez entrer l'URL et la description");
      return;
    }

    if (!selectedModule) {
      showError("Veuillez sélectionner un module");
      return;
    }

    setUploading(true);

    try {
      const resourceRef = ref(database, `resources/${type}/${selectedYear}/${selectedModule}`);
      const newResourceRef = push(resourceRef);
      const resourceId = newResourceRef.key;

      if (uploadType === "file") {
        // Upload file to Firebase Storage
        const fileExtension = uploadFile.name.split('.').pop();
        const storagePath = `${type}/${selectedYear}/${selectedModule}/${resourceId}.${fileExtension}`;
        const fileRef = storageRef(storage, storagePath);
        
        await uploadBytes(fileRef, uploadFile);
        const downloadURL = await getDownloadURL(fileRef);

        // Save metadata to database
        await set(newResourceRef, {
          id: resourceId,
          type: "file",
          file_type: fileExtension,
          location: storagePath,
          url: downloadURL,
          size: `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB`,
          created_at: new Date().toISOString()
        });

        showSuccess("Fichier téléchargé avec succès");
      } else {
        // Save link to database
        await set(newResourceRef, {
          id: resourceId,
          type: "link",
          url: linkUrl.trim(),
          description: linkDescription.trim(),
          created_at: new Date().toISOString()
        });

        showSuccess("Lien ajouté avec succès");
      }

      // Reset form
      setUploadFile(null);
      setUploadFileName("");
      setLinkUrl("");
      setLinkDescription("");
      setShowUpload(false);
      
      // Reload resources
      await loadResources();
      
      if (onFileChange) {
        onFileChange();
      }
    } catch (error) {
      console.error("Upload error:", error);
      showError("Erreur lors du téléchargement");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResource = async (resource) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer cette ressource ?`)) {
      return;
    }

    setDeleting(resource.key);
    try {
      // Delete from storage if it's a file
      if (resource.type === "file" && resource.location) {
        try {
          const fileRef = storageRef(storage, resource.location);
          await deleteObject(fileRef);
        } catch (storageError) {
          console.error("Storage delete error:", storageError);
        }
      }

      // Delete from database
      const resourceRef = ref(database, `resources/${type}/${selectedYear}/${selectedModule}/${resource.key}`);
      await set(resourceRef, null);

      showSuccess("Ressource supprimée avec succès");
      await loadResources();
      
      if (onFileChange) {
        onFileChange();
      }
    } catch (error) {
      showError("Erreur lors de la suppression");
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = (resource) => {
    if (resource.type === "link") {
      window.open(resource.url, "_blank");
    } else if (resource.url) {
      window.open(resource.url, "_blank");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (resource) => {
    if (resource.type === "link") return <FaLink />;
    
    switch (resource.file_type) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'ppt':
      case 'pptx': return '📊';
      case 'xls':
      case 'xlsx': return '📈';
      case 'zip':
      case 'rar': return '📦';
      default: return '📁';
    }
  };

  if (loading) {
    return (
      <div className="file-manager loading">
        <FaSpinner className="spinner" /> Chargement...
      </div>
    );
  }

  return (
    <div className="file-manager">
      <div className="file-manager-header">
        <h3 className="GTitle">Gestion des {title}</h3>
        <div className="file-manager-controls">
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedModule("");
            }}
            className="year-selector"
          >
            {years.map(year => (
              <option key={year.id} value={year.id}>{year.label}</option>
            ))}
          </select>
          
          {modules.length > 0 && (
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="year-selector"
            >
              {modules.map(module => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>
          )}
          
          <button
            className="btn btn-primary"
            onClick={() => setShowUpload(true)}
            disabled={!selectedModule}
          >
            <FaPlus /> Ajouter Ressource
          </button>
        </div>
      </div>

      {!selectedModule ? (
        <div className="no-files">
          <FaFile size={48} />
          <p>Veuillez sélectionner un module</p>
        </div>
      ) : (
        <div className="files-list">
          {resources.length === 0 ? (
            <div className="no-files">
              <FaFile size={48} />
              <p>Aucune ressource trouvée pour ce module</p>
            </div>
          ) : (
            <div className="files-grid">
              {resources.map((resource) => (
                <div key={resource.key} className="file-card">
                  <div className="file-icon">
                    {getFileIcon(resource)}
                  </div>
                  <div className="file-info">
                    <h4>{resource.description || resource.id}</h4>
                    <p className="file-meta">
                      {resource.size && `${resource.size} • `}
                      {formatDate(resource.created_at)}
                    </p>
                    {resource.type === "link" && (
                      <p className="file-url">{resource.url}</p>
                    )}
                  </div>
                  <div className="file-actions single-view-action">
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => handleDownload(resource)}
                      title={resource.type === "link" ? "Ouvrir le lien" : "Télécharger"}
                    >
                      <FaDownload /> {resource.type === "link" ? "Ouvrir" : "Télécharger"}
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteResource(resource)}
                      disabled={deleting === resource.key}
                    >
                      {deleting === resource.key ? (
                        <><FaSpinner className="spinner" /> Suppression...</>
                      ) : (
                        <><FaTrash /> Supprimer</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showUpload && (
        <div className="upload-modal">
          <div className="upload-modal-content">
            <div className="upload-modal-header">
              <h4>Ajouter une Ressource</h4>
              <button className="close-btn" onClick={() => setShowUpload(false)}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="upload-form">
              <div className="form-group">
                <label>Type de Ressource :</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                >
                  <option value="file">Fichier</option>
                  <option value="link">Lien</option>
                </select>
              </div>

              {uploadType === "file" ? (
                <>
                  <div className="form-group">
                    <label>Nom du Fichier :</label>
                    <input
                      type="text"
                      value={uploadFileName}
                      onChange={(e) => setUploadFileName(e.target.value)}
                      placeholder="Entrez le nom du fichier"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Sélectionner le Fichier :</label>
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        setUploadFile(file || null);
                        if (file && !uploadFileName.trim()) {
                          const lastDotIndex = file.name.lastIndexOf('.');
                          const baseName = lastDotIndex > 0 ? file.name.slice(0, lastDotIndex) : file.name;
                          setUploadFileName(baseName);
                        }
                      }}
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>URL du Lien :</label>
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://example.com"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Description :</label>
                    <input
                      type="text"
                      value={linkDescription}
                      onChange={(e) => setLinkDescription(e.target.value)}
                      placeholder="Description du lien"
                      required
                    />
                  </div>
                </>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUpload(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading}
                >
                  {uploading ? (
                    <><FaSpinner className="spinner" /> Téléchargement...</>
                  ) : (
                    <><FaUpload /> Ajouter</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManagerWithModules;
