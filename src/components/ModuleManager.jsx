import React, { useState, useEffect } from "react";
import { ref, get, set, remove } from "firebase/database";
import { database } from "../firebase";
import { FaPlus, FaTrash, FaEdit, FaTimes, FaSpinner, FaFolder, FaFile, FaClock } from "react-icons/fa";
import { useNotification } from "./NotificationContext";
import "./styles/ModuleManager.css";

const ModuleManager = () => {
  const [modules, setModules] = useState({ year3: [], year4: [], year5: [] });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState("year3");
  const [newModuleName, setNewModuleName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const { showSuccess, showError } = useNotification();

  const years = [
    { id: "year3", label: "3ème année" },
    { id: "year4", label: "4ème année" },
    { id: "year5", label: "5ème année" }
  ];

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    setLoading(true);
    try {
      const coursModules = { year3: [], year4: [], year5: [] };
      
      for (const year of ["year3", "year4", "year5"]) {
        const coursRef = ref(database, `resources/cours/${year}`);
        const tdRef = ref(database, `resources/td/${year}`);
        
        const [coursSnapshot, tdSnapshot] = await Promise.all([
          get(coursRef),
          get(tdRef)
        ]);
        
        if (coursSnapshot.exists()) {
          const moduleNames = Object.keys(coursSnapshot.val());
          const modulesWithData = await Promise.all(
            moduleNames.map(async (moduleName) => {
              const coursData = coursSnapshot.val()[moduleName];
              const tdData = tdSnapshot.exists() ? tdSnapshot.val()[moduleName] : null;
              
              // Count files and get last uploaded
              const coursFiles = coursData && typeof coursData === 'object' 
                ? Object.values(coursData).filter(item => item && item.id)
                : [];
              const tdFiles = tdData && typeof tdData === 'object'
                ? Object.values(tdData).filter(item => item && item.id)
                : [];
              
              const allFiles = [...coursFiles, ...tdFiles];
              const fileCount = allFiles.length;
              
              // Get last uploaded file
              let lastFile = null;
              if (allFiles.length > 0) {
                lastFile = allFiles.reduce((latest, file) => {
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
          
          coursModules[year] = modulesWithData;
        }
      }
      
      setModules(coursModules);
    } catch (error) {
      showError("Erreur lors du chargement des modules");
    } finally {
      setLoading(false);
    }
  };

  const handleAddModule = async (e) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;

    const sanitizedName = newModuleName.trim().replace(/[.#$[\]]/g, "_");
    
    if (modules[selectedYear].some(m => m.name === sanitizedName)) {
      showError("Ce module existe déjà");
      return;
    }

    setAdding(true);
    try {
      // Create module in both cours and td
      const coursRef = ref(database, `resources/cours/${selectedYear}/${sanitizedName}`);
      const tdRef = ref(database, `resources/td/${selectedYear}/${sanitizedName}`);
      
      await set(coursRef, { _placeholder: true });
      await set(tdRef, { _placeholder: true });

      setModules(prev => ({
        ...prev,
        [selectedYear]: [...prev[selectedYear], { name: sanitizedName, fileCount: 0, lastFile: null }]
      }));

      setNewModuleName("");
      setShowAddModal(false);
      showSuccess("Module ajouté avec succès");
    } catch (error) {
      showError("Erreur lors de l'ajout du module");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteModule = async (year, moduleName) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le module "${moduleName}" ? Tous les fichiers associés seront supprimés.`)) {
      return;
    }

    setDeleting(`${year}-${moduleName}`);
    try {
      const coursRef = ref(database, `resources/cours/${year}/${moduleName}`);
      const tdRef = ref(database, `resources/td/${year}/${moduleName}`);
      
      await remove(coursRef);
      await remove(tdRef);

      setModules(prev => ({
        ...prev,
        [year]: prev[year].filter(m => m.name !== moduleName)
      }));

      showSuccess("Module supprimé avec succès");
    } catch (error) {
      showError("Erreur lors de la suppression du module");
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="module-manager loading">
        <FaSpinner className="spinner" /> Chargement des modules...
      </div>
    );
  }

  return (
    <div className="module-manager">
      <div className="module-manager-header">
        <h3>Gestion des Modules</h3>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <FaPlus /> Ajouter Module
        </button>
      </div>

      <div className="modules-grid">
        {years.map(year => (
          <div key={year.id} className="year-section">
            <h4>{year.label}</h4>
            <div className="modules-list">
              {modules[year.id].length === 0 ? (
                <p className="no-modules">Aucun module</p>
              ) : (
                modules[year.id].map(module => (
                  <div key={module.name} className="module-card">
                    <div className="module-card-header">
                      <div className="module-icon">
                        <FaFolder />
                      </div>
                      <div className="module-title">
                        <h5>{module.name}</h5>
                      </div>
                    </div>
                    
                    <div className="module-card-body">
                      <div className="module-stat">
                        <FaFile className="stat-icon" />
                        <div className="stat-info">
                          <span className="stat-label">Fichiers</span>
                          <span className="stat-value">{module.fileCount}</span>
                        </div>
                      </div>
                      
                      {module.lastFile ? (
                        <div className="module-stat">
                          <FaClock className="stat-icon" />
                          <div className="stat-info">
                            <span className="stat-label">Dernier ajout</span>
                            <span className="stat-value">{formatDate(module.lastFile.created_at)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="module-stat">
                          <FaClock className="stat-icon" />
                          <div className="stat-info">
                            <span className="stat-label">Dernier ajout</span>
                            <span className="stat-value">Aucun fichier</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="module-card-footer">
                      <button
                        className="btn btn-danger btn-delete-module"
                        onClick={() => handleDeleteModule(year.id, module.name)}
                        disabled={deleting === `${year.id}-${module.name}`}
                      >
                        {deleting === `${year.id}-${module.name}` ? (
                          <><FaSpinner className="spinner" /> Suppression...</>
                        ) : (
                          <><FaTrash /> Supprimer</>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="upload-modal">
          <div className="upload-modal-content">
            <div className="upload-modal-header">
              <h4>Ajouter un Nouveau Module</h4>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleAddModule} className="upload-form">
              <div className="form-group">
                <label>Année :</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {years.map(year => (
                    <option key={year.id} value={year.id}>{year.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Nom du Module :</label>
                <input
                  type="text"
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  placeholder="Ex: Module_gestion_de_produit_et_qualité"
                  required
                />
                <small>Utilisez des underscores (_) au lieu d'espaces</small>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={adding}
                >
                  {adding ? <><FaSpinner className="spinner" /> Ajout...</> : <><FaPlus /> Ajouter</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleManager;
