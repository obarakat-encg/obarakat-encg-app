import React, { useState, useEffect } from "react";
import { ref, get, set, push, remove } from "firebase/database";
import { database } from "../firebase";
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUsers, FaLink, FaPlus, FaTimes, FaSpinner, FaTrash, FaExclamationTriangle } from "react-icons/fa";
import { useNotification } from "./NotificationContext";
import "./styles/SeminarManager.css";

const SeminarManager = () => {
  const [seminars, setSeminars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    type: "",
    customType: "",
    description: "",
    date: "",
    time: "",
    location: "",
    spots: "",
    link: ""
  });

  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    loadSeminars();
  }, []);

  const loadSeminars = async () => {
    setLoading(true);
    try {
      const seminarsRef = ref(database, 'seminar');
      const snapshot = await get(seminarsRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const seminarsList = Object.entries(data).map(([key, value]) => ({
          ...value,
          id: key
        }));
        
        // Sort by date from latest to earliest
        seminarsList.sort((a, b) => new Date(b.date) - new Date(a.date));
        setSeminars(seminarsList);
      } else {
        setSeminars([]);
      }
    } catch (error) {
      showError("Erreur lors du chargement des séminaires");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddSeminar = async (e) => {
    e.preventDefault();
    
    const finalType = formData.type === "Autre" ? formData.customType : formData.type;
    
    if (!finalType || !formData.date || !formData.time || !formData.location) {
      showError("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (formData.type === "Autre" && !formData.customType.trim()) {
      showError("Veuillez spécifier le type d'événement");
      return;
    }

    setAdding(true);
    try {
      const seminarsRef = ref(database, 'seminar');
      const newSeminarRef = push(seminarsRef);
      
      const seminarData = {
        id: newSeminarRef.key,
        type: finalType,
        description: formData.description || "",
        date: formData.date,
        time: formData.time,
        location: formData.location,
        spots: parseInt(formData.spots) || 0,
        link: formData.link || ""
      };

      await set(newSeminarRef, seminarData);
      
      showSuccess("Séminaire ajouté avec succès");
      setFormData({
        type: "",
        customType: "",
        description: "",
        date: "",
        time: "",
        location: "",
        spots: "",
        link: ""
      });
      setShowAddModal(false);
      await loadSeminars();
    } catch (error) {
      showError("Erreur lors de l'ajout du séminaire");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSeminar = async (seminarId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce séminaire ?")) {
      return;
    }

    setDeleting(seminarId);
    try {
      const seminarRef = ref(database, `seminar/${seminarId}`);
      await remove(seminarRef);
      
      showSuccess("Séminaire supprimé avec succès");
      await loadSeminars();
    } catch (error) {
      showError("Erreur lors de la suppression du séminaire");
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isPastDate = (dateString) => {
    const seminarDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return seminarDate < today;
  };

  if (loading) {
    return (
      <div className="seminar-manager loading">
        <FaSpinner className="spinner" /> Chargement des séminaires...
      </div>
    );
  }

  return (
    <div className="seminar-manager">
      <div className="seminar-manager-header">
        <h3 className="GTitle">Gestion des Séminaires</h3>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          <FaPlus /> Ajouter Séminaire
        </button>
      </div>

      {seminars.length === 0 ? (
        <div className="no-seminars">
          <FaCalendarAlt size={48} />
          <p>Aucun séminaire trouvé</p>
        </div>
      ) : (
        <div className="seminars-grid">
          {seminars.map((seminar) => {
            const isPast = isPastDate(seminar.date);
            
            return (
              <div key={seminar.id} className={`seminar-card ${isPast ? 'past' : ''}`}>
                {isPast && (
                  <div className="past-badge">
                    <FaExclamationTriangle /> Événement passé
                  </div>
                )}
                
                <div className="seminar-header">
                  <div className="seminar-type-badge">{seminar.type}</div>
                  <button
                    className="btn btn-sm btn-danger delete-btn"
                    onClick={() => handleDeleteSeminar(seminar.id)}
                    disabled={deleting === seminar.id}
                    title="Supprimer"
                  >
                    {deleting === seminar.id ? (
                      <FaSpinner className="spinner" />
                    ) : (
                      <FaTrash />
                    )}
                  </button>
                </div>

                {seminar.description && (
                  <p className="seminar-description">{seminar.description}</p>
                )}
                
                <div className="seminar-details">
                  <div className="seminar-detail">
                    <FaCalendarAlt />
                    <span>{formatDate(seminar.date)}</span>
                  </div>
                  <div className="seminar-detail">
                    <FaClock />
                    <span>{seminar.time || "Heure non spécifiée"}</span>
                  </div>
                  <div className="seminar-detail">
                    <FaMapMarkerAlt />
                    <span>{seminar.location || "Lieu non spécifié"}</span>
                  </div>
                  {seminar.spots > 0 && (
                    <div className="seminar-detail">
                      <FaUsers />
                      <span>{seminar.spots} places</span>
                    </div>
                  )}
                  {seminar.link && (
                    <div className="seminar-detail">
                      <FaLink />
                      <a href={seminar.link} target="_blank" rel="noopener noreferrer">
                        Lien d'inscription
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Seminar Modal */}
      {showAddModal && (
        <div className="upload-modal">
          <div className="upload-modal-content">
            <div className="upload-modal-header">
              <h4>Ajouter un Séminaire</h4>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleAddSeminar} className="upload-form">
              <div className="form-group">
                <label>Type d'événement *</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Sélectionner un type</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Webinar">Webinar</option>
                  <option value="Conférence">Conférence</option>
                  <option value="Séminaire">Séminaire</option>
                  <option value="Atelier">Atelier</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              {formData.type === "Autre" && (
                <div className="form-group">
                  <label>Spécifier le type *</label>
                  <input
                    type="text"
                    name="customType"
                    value={formData.customType}
                    onChange={handleInputChange}
                    placeholder="Ex: Table ronde, Colloque..."
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Description de l'événement..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Heure *</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Lieu *</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Ex: Room C203, Online via Meet"
                  required
                />
              </div>

              <div className="form-group">
                <label>Nombre de places</label>
                <input
                  type="number"
                  name="spots"
                  value={formData.spots}
                  onChange={handleInputChange}
                  placeholder="Ex: 30"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Lien d'inscription</label>
                <input
                  type="url"
                  name="link"
                  value={formData.link}
                  onChange={handleInputChange}
                  placeholder="https://example.com/register"
                />
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
                  {adding ? (
                    <><FaSpinner className="spinner" /> Ajout...</>
                  ) : (
                    <><FaPlus /> Ajouter</>
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

export default SeminarManager;
