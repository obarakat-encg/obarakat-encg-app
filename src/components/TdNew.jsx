import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ref, get } from "firebase/database";
import { database } from "../firebase";
import { Context } from "./context";
import { useNotification } from "./NotificationContext";
import LoginRequiredModal from "./LoginRequiredModal";
import { FaFolder, FaFile, FaLink, FaDownload, FaSpinner, FaArrowLeft, FaChevronRight } from "react-icons/fa";
import "./styles/cours.css";

const TdNew = () => {
  const { year } = useParams(); // Get year from URL
  const navigate = useNavigate();
  const { role } = useContext(Context);
  const { showSuccess, showError } = useNotification();
  
  const [selectedModule, setSelectedModule] = useState(null);
  const [modules, setModules] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingResources, setLoadingResources] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState(null);

  const years = {
    "3eme": { id: "year3", label: "3ème année", color: "#9C27B0" },
    "4eme": { id: "year4", label: "4ème année", color: "#E91E63" },
    "5eme": { id: "year5", label: "5ème année", color: "#F44336" }
  };

  const currentYear = year ? years[year] : null;

  useEffect(() => {
    if (year && currentYear) {
      loadModules();
    }
  }, [year]);

  useEffect(() => {
    if (currentYear && selectedModule) {
      // Clear old resources immediately to prevent showing wrong files
      setResources([]);
      setLoadingResources(true);
      loadResources();
    }
  }, [selectedModule]);

  const loadModules = async () => {
    if (!currentYear) return;
    
    setLoading(true);
    try {
      const tdRef = ref(database, `resources/td/${currentYear.id}`);
      const snapshot = await get(tdRef);
      
      if (snapshot.exists()) {
        const moduleNames = Object.keys(snapshot.val());
        
        // Sort modules: "autres_ressources_pedagogiques" at the end
        const sortedModules = moduleNames.sort((a, b) => {
          const aIsAutres = a.toLowerCase().includes('autre');
          const bIsAutres = b.toLowerCase().includes('autre');
          
          if (aIsAutres && !bIsAutres) return 1;
          if (!aIsAutres && bIsAutres) return -1;
          return a.localeCompare(b);
        });
        
        setModules(sortedModules);
      } else {
        setModules([]);
      }
    } catch (error) {
      showError("Erreur lors du chargement des modules");
    } finally {
      setLoading(false);
    }
  };

  // Format module name for display
  const formatModuleName = (moduleName) => {
    return moduleName
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const loadResources = async () => {
    if (!selectedModule || !currentYear) return;
    
    try {
      const resourcesRef = ref(database, `resources/td/${currentYear.id}/${selectedModule}`);
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
    } finally {
      setLoadingResources(false);
    }
  };

  const handleDownload = async (resource) => {
    if (!role) {
      setShowLoginModal(true);
      return;
    }

    if (resource.type === "link") {
      window.open(resource.url, "_blank");
      return;
    }

    setDownloadingFile(resource.key);
    try {
      if (resource.location) {
        // Download from R2 via Worker (authenticated)
        const downloadUrl = `${import.meta.env.VITE_R2_WORKER_URL}/download?path=${encodeURIComponent(resource.location)}`;
        
        const response = await fetch(downloadUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('encg_user_role') || 'anonymous'}`
          }
        });

        if (!response.ok) {
          throw new Error('Download failed');
        }

        const blob = await response.blob();
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
        
        showSuccess("Téléchargement démarré");
      }
    } catch (error) {
      showError("Erreur lors du téléchargement");
    } finally {
      setDownloadingFile(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFileIcon = (resource) => {
    if (resource.type === "link") return <FaLink style={{ color: "#E91E63" }} />;
    
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
      default: return <FaFile />;
    }
  };

  // If no year selected, show year selection cards
  if (!year || !currentYear) {
    const yearOptions = [
      { id: "3eme", label: "3ème année", icon: "📝", color: "#9C27B0" },
      { id: "4eme", label: "4ème année", icon: "✏️", color: "#E91E63" },
      { id: "5eme", label: "5ème année", icon: "📋", color: "#F44336" }
    ];

    return (
      <motion.section 
            className="cours-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut'}}
          >
        <header className="cours-header">
          <div className="cours-title-section">
            <h1 className="cours-title">Travaux Dirigés (TDs)</h1>
            <p className="cours-subtitle">Sélectionnez une année pour voir les TD disponibles</p>
          </div>
        </header>

        <div className="year-selection-grid">
          {yearOptions.map((yearOption) => (
            <a
              key={yearOption.id}
              href={`/td/${yearOption.id}`}
              className="year-card"
              style={{ '--card-color': yearOption.color }}
            >
              <div className="year-card-icon">{yearOption.icon}</div>
              <h3 className="year-card-title">{yearOption.label}</h3>
              <p className="year-card-description">
                Accéder aux TD de {yearOption.label}
              </p>
              <div className="year-card-arrow">→</div>
            </a>
          ))}
        </div>
      </motion.section>
    );
  }

  // Module selection view
  if (!selectedModule) {
    return (
      <section className="cours-container">
        <header className="cours-header">
          <div className="cours-title-section">
            <h1 className="cours-title">{currentYear.label} - TDs</h1>
            <p className="cours-subtitle">Sélectionnez un module</p>
          </div>
        </header>

        {loading ? (
          <div className="cours-status">
            <FaSpinner className="spinner" /> Chargement...
          </div>
        ) : modules.length === 0 ? (
          <div className="cours-status">Aucun module disponible pour cette année</div>
        ) : (
          <div className="modules-grid-view">
            {modules.map(moduleName => (
              <div
                key={moduleName}
                className="module-card-view"
                onClick={() => setSelectedModule(moduleName)}
              >
                <div className="module-icon">
                  <FaFolder size={32} style={{ color: currentYear.color, flexShrink: 0 }} />
                </div>
                <h3 style={{
                  overflow: 'hidden',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  flex: 1,
                  margin: 0,
                  lineHeight: 1.3
                }}>
                  {formatModuleName(moduleName)}
                </h3>
                <FaChevronRight className="module-arrow" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}

        <LoginRequiredModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          actionType="download"
        />
      </section>
    );
  }

  // Resources view

  return (
    <motion.section 
      className="cours-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.3 }}
    >
      <header className="cours-header">
        <div className="cours-title-section">
          <button 
            className="btn-back"
            onClick={() => setSelectedModule(null)}
          >
            <FaArrowLeft /> Retour
          </button>
          <div>
            <h1 className="cours-title">{selectedModule}</h1>
            <p className="cours-subtitle">{currentYear?.label} - TDs</p>
          </div>
        </div>
      </header>

      {loadingResources ? (
        <div className="cours-status">
          <span className="spinner"></span> Chargement des fichiers...
        </div>
      ) : resources.length === 0 ? (
        <div className="cours-status">Ce module est vide. Aucun fichier disponible pour le moment.</div>
      ) : (
        <div className="cours-grid">
          {resources.map((resource) => (
            <article key={resource.key} className="cours-card">
              <div className="cours-card-header">
                <div className="cours-file-name">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getFileIcon(resource)}
                    <span>{resource.description || resource.id}</span>
                  </span>
                </div>
                <div className={`badge ext-${resource.file_type || 'link'}`}>
                  {resource.type === "link" ? "LINK" : resource.file_type?.toUpperCase()}
                </div>
              </div>
              <div className="cours-card-meta">
                <span>Ajouté: {formatDate(resource.created_at)}</span>
                {resource.size && <span>Taille: {resource.size}</span>}
                {resource.type === "link" && (
                  <span className="link-url" style={{ 
                    fontSize: '12px', 
                    color: '#E91E63',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block'
                  }}>
                    {resource.url}
                  </span>
                )}
              </div>
              <div className="cours-card-actions single-action">
                <button
                  className="btn btn-download"
                  onClick={() => handleDownload(resource)}
                  disabled={downloadingFile === resource.key}
                >
                  {downloadingFile === resource.key ? (
                    <><FaSpinner className="spinner" /> Téléchargement...</>
                  ) : (
                    <><FaDownload /> {resource.type === "link" ? "Ouvrir" : "Télécharger"}</>
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        actionType="download"
      />
    </motion.section>
  );
};

export default TdNew;
