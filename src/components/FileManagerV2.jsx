import React, { useState, useEffect } from "react";
import { ref, get, set, push, remove } from "firebase/database";
import { database } from "../firebase";
// Firebase Storage removed - using Cloudflare R2 instead
// import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
// import { storage } from "../firebase";
import { FaUpload, FaTrash, FaFile, FaDownload, FaPlus, FaTimes, FaSpinner, FaLink, FaFolder, FaEdit, FaArrowLeft, FaClock } from "react-icons/fa";
import { useNotification } from "./NotificationContext";
import "./styles/FileManager.css";

const FileManagerV2 = ({ type, title, onFileChange }) => {
  const [modules, setModules] = useState([]);
  const [resources, setResources] = useState([]);
  const [selectedYear, setSelectedYear] = useState("year3");
  const [selectedModule, setSelectedModule] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Module management
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const [addingModule, setAddingModule] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [editModuleName, setEditModuleName] = useState("");
  
  // Resource management
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState("file");
  const [uploadFile, setUploadFile] = useState(null);
  const [fileName, setFileName] = useState(""); // Editable filename
  const [linkUrl, setLinkUrl] = useState("");
  const [linkDescription, setLinkDescription] = useState("");
  const [deleting, setDeleting] = useState(null);
  
  const { showSuccess, showError } = useNotification();

  const years = [
    { id: "year3", label: "3ème année" },
    { id: "year4", label: "4ème année" },
    { id: "year5", label: "5ème année" }
  ];

  const [modulesData, setModulesData] = useState([]);

  useEffect(() => {
    loadModules();
  }, [selectedYear, type]);

  useEffect(() => {
    if (selectedModule) {
      loadResources();
    }
  }, [selectedModule]);

  const loadModules = async (keepSelection = false) => {
    setLoading(true);
    if (!keepSelection) {
      setSelectedModule(null);
    }
    try {
      const modulesRef = ref(database, `resources/${type}/${selectedYear}`);
      const snapshot = await get(modulesRef);
      
      if (snapshot.exists()) {
        const moduleNames = Object.keys(snapshot.val());
        setModules(moduleNames);
        
        // Load detailed data for each module
        const modulesWithData = await Promise.all(
          moduleNames.map(async (moduleName) => {
            const moduleData = snapshot.val()[moduleName];
            
            // Count files and get last uploaded
            const files = moduleData && typeof moduleData === 'object' 
              ? Object.values(moduleData).filter(item => item && item.id)
              : [];
            
            const fileCount = files.length;
            
            // Get last uploaded file
            let lastFile = null;
            if (files.length > 0) {
              lastFile = files.reduce((latest, file) => {
                if (!latest || (file.created_at && file.created_at > latest.created_at)) {
                  return file;
                }
                return latest;
              }, null);
            }
            
            return {
              name: moduleName,
              fileCount,
              lastFile
            };
          })
        );
        
        setModulesData(modulesWithData);
      } else {
        setModules([]);
        setModulesData([]);
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
        // Filter out _placeholder and only include actual resources
        const resourcesList = Object.entries(data)
          .filter(([key, value]) => key !== '_placeholder' && value && value.id)
          .map(([key, value]) => ({ ...value, key }));
        setResources(resourcesList);
      } else {
        setResources([]);
      }
    } catch (error) {
      showError("Erreur lors du chargement des ressources");
    }
  };

  const handleAddModule = async (e) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;

    // Allow spaces, only replace Firebase-forbidden characters
    const sanitizedName = newModuleName.trim().replace(/[.#$[\]\/]/g, "_");
    
    if (modules.includes(sanitizedName)) {
      showError("Ce module existe déjà");
      return;
    }

    setAddingModule(true);
    try {
      const moduleRef = ref(database, `resources/${type}/${selectedYear}/${sanitizedName}`);
      await set(moduleRef, { _placeholder: true });

      // Update modules list immediately
      setModules(prev => [...prev, sanitizedName]);
      
      // Update modulesData immediately for real-time display
      setModulesData(prev => [...prev, {
        name: sanitizedName,
        fileCount: 0,
        lastFile: null
      }]);
      
      setNewModuleName("");
      setShowAddModule(false);
      showSuccess("Module ajouté avec succès");
    } catch (error) {
      showError("Erreur lors de l'ajout du module");
    } finally {
      setAddingModule(false);
    }
  };

  const handleRenameModule = async (oldName) => {
    if (!editModuleName.trim() || editModuleName === oldName) {
      setEditingModule(null);
      return;
    }

    // Allow spaces, only replace Firebase-forbidden characters
    const sanitizedName = editModuleName.trim().replace(/[.#$[\]\/]/g, "_");
    
    if (modules.includes(sanitizedName)) {
      showError("Ce nom de module existe déjà");
      return;
    }

    try {
      // Get old module data
      const oldRef = ref(database, `resources/${type}/${selectedYear}/${oldName}`);
      const snapshot = await get(oldRef);
      
      if (snapshot.exists()) {
        // Create new module with same data
        const newRef = ref(database, `resources/${type}/${selectedYear}/${sanitizedName}`);
        await set(newRef, snapshot.val());
        
        // Delete old module
        await remove(oldRef);
        
        // Update modules list immediately
        setModules(prev => prev.map(m => m === oldName ? sanitizedName : m));
        
        // Update modulesData immediately for real-time display
        setModulesData(prev => prev.map(m => 
          m.name === oldName 
            ? { ...m, name: sanitizedName }
            : m
        ));
        
        // Update selected module if it was the renamed one
        if (selectedModule === oldName) {
          setSelectedModule(sanitizedName);
        }
        
        showSuccess("Module renommé avec succès");
      }
    } catch (error) {
      showError("Erreur lors du renommage du module");
    } finally {
      setEditingModule(null);
      setEditModuleName("");
    }
  };

  const handleDeleteModule = async (moduleName) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le module "${moduleName}" ? Tous les fichiers associés seront supprimés.`)) {
      return;
    }

    try {
      const moduleRef = ref(database, `resources/${type}/${selectedYear}/${moduleName}`);
      await remove(moduleRef);

      // Update modules list immediately
      setModules(prev => prev.filter(m => m !== moduleName));
      
      // Update modulesData immediately for real-time display
      setModulesData(prev => prev.filter(m => m.name !== moduleName));
      
      if (selectedModule === moduleName) {
        setSelectedModule(null);
      }
      showSuccess("Module supprimé avec succès");
    } catch (error) {
      showError("Erreur lors de la suppression du module");
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    if (uploadType === "file" && !uploadFile) {
      showError("Veuillez sélectionner un fichier");
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
        // Validate filename
        if (!fileName.trim()) {
          showError("Veuillez entrer un nom de fichier");
          setUploading(false);
          return;
        }

        const fileExtension = uploadFile.name.split('.').pop();
        // Use custom filename instead of resourceId for better readability
        const sanitizedFileName = fileName.trim().replace(/[^a-zA-Z0-9_\-\s]/g, '_');
        const storagePath = `${type}/${selectedYear}/${selectedModule}/${sanitizedFileName}_${resourceId}.${fileExtension}`;
        
        // Upload to R2 via Cloudflare Worker
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('path', storagePath);

        const uploadResponse = await fetch(`${import.meta.env.VITE_R2_WORKER_URL}/upload`, {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('encg_user_role') || 'anonymous'}`
          }
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || 'Upload failed');
        }

        const { path } = await uploadResponse.json();

        await set(newResourceRef, {
          id: resourceId,
          type: "file",
          file_type: fileExtension,
          location: path,
          description: fileName.trim(), // Use custom filename
          url: `${import.meta.env.VITE_R2_WORKER_URL}/download?path=${encodeURIComponent(path)}`,
          size: `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB`,
          created_at: new Date().toISOString()
        });

        showSuccess("Fichier téléchargé avec succès");
      } else {
        await set(newResourceRef, {
          id: resourceId,
          type: "link",
          url: linkUrl.trim(),
          description: linkDescription.trim(),
          created_at: new Date().toISOString()
        });

        showSuccess("Lien ajouté avec succès");
      }

      setUploadFile(null);
      setFileName("");
      setLinkUrl("");
      setLinkDescription("");
      setShowUpload(false);
      
      await loadResources();
      
      // Reload modules to update file count and last upload (keep selection)
      await loadModules(true);
      
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
      if (resource.type === "file" && resource.location) {
        try {
          // Delete from R2 via Cloudflare Worker
          const deleteResponse = await fetch(`${import.meta.env.VITE_R2_WORKER_URL}/delete`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('encg_user_role') || 'anonymous'}`
            },
            body: JSON.stringify({ path: resource.location })
          });

          if (!deleteResponse.ok) {
            console.error("R2 delete error:", await deleteResponse.text());
          }
        } catch (storageError) {
          console.error("Storage delete error:", storageError);
        }
      }

      const resourceRef = ref(database, `resources/${type}/${selectedYear}/${selectedModule}/${resource.key}`);
      await remove(resourceRef);

      // Check if this was the last file, if so, add placeholder to keep module
      const moduleRef = ref(database, `resources/${type}/${selectedYear}/${selectedModule}`);
      const moduleSnapshot = await get(moduleRef);
      
      if (moduleSnapshot.exists()) {
        const moduleData = moduleSnapshot.val();
        const remainingFiles = Object.values(moduleData).filter(item => item && item.id);
        
        // If no files left, add placeholder to keep module
        if (remainingFiles.length === 0) {
          await set(ref(database, `resources/${type}/${selectedYear}/${selectedModule}/_placeholder`), true);
        }
      }

      showSuccess("Ressource supprimée avec succès");
      await loadResources();
      
      // Reload modules to update file count and last upload (keep selection)
      await loadModules(true);
      
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
      // Open external links directly
      window.open(resource.url, "_blank");
    } else if (resource.location) {
      // Download from R2 via Worker (authenticated)
      const downloadUrl = `${import.meta.env.VITE_R2_WORKER_URL}/download?path=${encodeURIComponent(resource.location)}`;
      
      // Create a temporary link with auth header
      fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('encg_user_role') || 'anonymous'}`
        }
      })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Use custom description as filename with proper extension
        const extension = resource.file_type || resource.location.split('.').pop();
        a.download = `${resource.description || 'fichier'}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(error => {
        console.error('Download error:', error);
        showError("Erreur lors du téléchargement");
      });
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
        <h3 className="GTitle">
          {selectedModule ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                className="btn btn-sm btn-secondary" 
                onClick={() => setSelectedModule(null)}
                style={{ padding: '5px 10px' }}
              >
                <FaArrowLeft /> Retour
              </button>
              {selectedModule}
            </span>
          ) : (
            `Gestion des ${title}`
          )}
        </h3>
        <div className="file-manager-controls">
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedModule(null);
            }}
            className="year-selector"
          >
            {years.map(year => (
              <option key={year.id} value={year.id}>{year.label}</option>
            ))}
          </select>
          
          {!selectedModule && (
            <button
              className="btn btn-primary"
              onClick={() => setShowAddModule(true)}
            >
              <FaPlus /> Ajouter Module
            </button>
          )}
          
          {selectedModule && (
            <button
              className="btn btn-primary"
              onClick={() => setShowUpload(true)}
            >
              <FaPlus /> Ajouter Ressource
            </button>
          )}
        </div>
      </div>

      {!selectedModule ? (
        // Module List View
        <div className="modules-view">
          {modules.length === 0 ? (
            <div className="no-modules-found">
              <div className="no-modules-icon">
                <FaFolder />
              </div>
              <h3>Aucun module disponible</h3>
              <p>Aucun module trouvé pour {years.find(y => y.id === selectedYear)?.label}</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowAddModule(true)}
              >
                <FaPlus /> Créer votre premier module
              </button>
            </div>
          ) : (
            <div className="modules-grid-cards">
              {modulesData.map((module) => (
                <div key={module.name} className="module-display-card">
                  {editingModule === module.name ? (
                    <div className="module-edit-inline">
                      <input
                        type="text"
                        value={editModuleName}
                        onChange={(e) => setEditModuleName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleRenameModule(module.name)}
                        placeholder="Modifiez le nom de votre module"
                        autoFocus
                      />
                      <div className="edit-actions">
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleRenameModule(module.name)}
                        >
                          ✓
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setEditingModule(null)}
                        >
                          ✗
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div 
                        className="module-display-header"
                        onClick={() => setSelectedModule(module.name)}
                      >
                        <div className="module-display-icon">
                          <FaFolder />
                        </div>
                        <div className="module-display-title">
                          <h5>{module.name}</h5>
                        </div>
                      </div>
                      
                      <div className="module-display-body">
                        <div className="module-display-stat">
                          <FaFile className="stat-icon-display" />
                          <div className="stat-info-display">
                            <span className="stat-label-display">Fichiers</span>
                            <span className="stat-value-display">{module.fileCount}</span>
                          </div>
                        </div>
                        
                        {module.lastFile ? (
                          <div className="module-display-stat">
                            <FaClock className="stat-icon-display" />
                            <div className="stat-info-display">
                              <span className="stat-label-display">Dernier ajout</span>
                              <span className="stat-value-display">{formatDate(module.lastFile.created_at)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="module-display-stat">
                            <FaClock className="stat-icon-display" />
                            <div className="stat-info-display">
                              <span className="stat-label-display">Dernier ajout</span>
                              <span className="stat-value-display">Aucun fichier</span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="module-display-footer">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingModule(module.name);
                            setEditModuleName(module.name);
                          }}
                          title="Renommer"
                        >
                          <FaEdit /> Renommer
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteModule(module.name);
                          }}
                          title="Supprimer"
                        >
                          <FaTrash /> Supprimer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Resources List View
        <div className="files-list">
          {resources.length === 0 ? (
            <div className="no-resources-found">
              <div className="no-resources-icon">
                <FaFile />
              </div>
              <h3>Ce module est vide</h3>
              <p>Téléchargez des fichiers pour remplir ce module</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowUpload(true)}
              >
                <FaPlus /> Ajouter des fichiers
              </button>
            </div>
          ) : (
            <div className="files-grid">
              {resources.map((resource) => (
                <div key={resource.key} className="file-card">
                  <div className="file-icon">
                    {getFileIcon(resource)}
                  </div>
                  <div className="file-info">
                    <h4 style={{
                      overflow: 'hidden',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: 1.4
                    }}>
                      {resource.description || resource.id}
                    </h4>
                    <p className="file-meta" style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: 1.4
                    }}>
                      {resource.size && <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resource.size}</span>}
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDate(resource.created_at)}</span>
                    </p>
                    {resource.type === "link" && (
                      <p className="file-url" style={{
                        fontSize: '12px',
                        color: '#666',
                        wordBreak: 'break-all',
                        overflowWrap: 'break-word',
                        marginTop: '4px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {resource.url}
                      </p>
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

      {/* Add Module Modal */}
      {showAddModule && (
        <div className="upload-modal">
          <div className="upload-modal-content">
            <div className="upload-modal-header">
              <h4>Ajouter un Nouveau Module</h4>
              <button className="close-btn" onClick={() => setShowAddModule(false)}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleAddModule} className="upload-form">
              <div className="form-group">
                <label>Nom du Module :</label>
                <input
                  type="text"
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  placeholder="Ex: Gestion de produit et qualité"
                  required
                />
                <small>Nommez votre module</small>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModule(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={addingModule}
                >
                  {addingModule ? <><FaSpinner className="spinner" /> Ajout...</> : <><FaPlus /> Ajouter</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Resource Modal */}
      {showUpload && (
        <div className="upload-modal">
          <div className="upload-modal-content">
            <div className="upload-modal-header">
              <h4>Ajouter une Ressource</h4>
              <button className="close-btn" onClick={() => {
                setShowUpload(false);
                setUploadFile(null);
                setFileName("");
                setLinkUrl("");
                setLinkDescription("");
              }}>
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
                    <label>Sélectionner le Fichier :</label>
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        setUploadFile(file || null);
                        // Auto-fill filename without extension
                        if (file) {
                          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                          setFileName(nameWithoutExt);
                        }
                      }}
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Nom du Fichier :</label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="Ex: Cours Chapitre 1"
                      required
                    />
                    <small>Ce nom sera affiché aux étudiants</small>
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
                  onClick={() => {
                    setShowUpload(false);
                    setUploadFile(null);
                    setFileName("");
                    setLinkUrl("");
                    setLinkDescription("");
                  }}
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

export default FileManagerV2;
