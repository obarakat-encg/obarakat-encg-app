import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { FaUserPlus, FaTrash, FaEdit, FaEye, FaEyeSlash, FaSave, FaTimes, FaUser, FaLock, FaSpinner } from "react-icons/fa";
import { dbUtils } from "../utils/db-utils"; // Assumes dbUtils exists for RTDB operations
import { useNotification } from "./NotificationContext"; // Assumes NotificationContext exists
import "./styles/UserManager.css";

// --- Helper Functions ---

// Simple date formatting (optional, but good for display)
const formatDate = (isoString) => {
  if (!isoString) return 'N/A';
  return new Date(isoString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// --- Confirmation Modal Component (Inline for single-file mandate) ---
const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, isLoading }) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onCancel} disabled={isLoading}>×</button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>Annuler</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <><FaSpinner className="spinner" /> Suppression...</>
            ) : (
              'Confirmer'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};


// --- Main Component ---

const UserManager = () => {
  // Array of user objects fetched from RTDB
  const [users, setUsers] = useState([]);
  // State for the Add/Edit Modal
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  // User data currently being edited or added (null means 'Add')
  const [editingUser, setEditingUser] = useState(null);
  // Separate state for password input (only for Add/Change)
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // State for delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [userToDeleteUid, setUserToDeleteUid] = useState(null);
  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [deletingUid, setDeletingUid] = useState(null);
  const [togglingUid, setTogglingUid] = useState(null);

  // Notification context hook
  const { showSuccess, showError } = useNotification();

  // Static lists
  const years = ["3eme", "4eme", "5eme"];
  const roles = [
    { value: "student", label: "Étudiant" },
    { value: "admin", label: "Admin" }
  ];

  // --- Real-time Data Fetching (RTDB) ---
  useEffect(() => {
    let unsubscribe = null;

    // Wait a bit to ensure Firebase Auth is ready before subscribing
    const timer = setTimeout(() => {
      // dbUtils.onUsersChange subscribes to RTDB and calls the callback whenever data changes
      unsubscribe = dbUtils.onUsersChange((fetchedUsers) => {
        // The callback receives an array of user objects with RTDB UID as 'uid'
        setUsers(fetchedUsers);
      }, (error) => {
        showError("Erreur de chargement des utilisateurs.");
        // If permission denied, show helpful message
        if (error.message?.includes('permission') || error.message?.includes('PERMISSION_DENIED')) {
          // Permission denied - silently handle
        }
      });
    }, 500); // Small delay to ensure auth is ready

    return () => {
      clearTimeout(timer);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // --- Handlers for Add/Edit Modal ---

  const handleAddNewUser = () => {
    setEditingUser({
      username: "",
      role: "student",
      year: "3eme",
      created_at: new Date().toISOString()
    });
    setPasswordInput(''); // Clear password field
    setShowAddEditModal(true);
  };

  const handleEditUser = (user) => {
    // FIX 2: Explicitly set the fields including UID to prevent state loss
    setEditingUser({
      uid: user.uid,
      username: user.username,
      role: user.role,
      year: user.year || '',
      // Copy other potential properties if they exist, but keep it minimal
      isActive: user.isActive,
      createdAt: user.createdAt || user.created_at, // Handle both field names
    });
    setPasswordInput('');
    setShowAddEditModal(true);
  };

  const handleModalClose = () => {
    setShowAddEditModal(false);
    setEditingUser(null);
    setPasswordInput('');
    setShowPassword(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Check if the input is the password field (managed separately)
    if (name === 'password') {
      setPasswordInput(value);
    } else if (name === 'username') {
      // Sanitize username input
      const sanitizedValue = value.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 20);
      setEditingUser(prev => ({ ...prev, [name]: sanitizedValue }));
    } else {
      setEditingUser(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();

    // Enhanced validation
    if (!editingUser.username || editingUser.username.trim().length < 3) {
      showError("Le nom d'utilisateur doit contenir au moins 3 caractères.");
      return;
    }

    if (editingUser.username.length > 20) {
      showError("Le nom d'utilisateur ne peut pas dépasser 20 caractères.");
      return;
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(editingUser.username)) {
      showError("Le nom d'utilisateur ne peut contenir que des 3 à 20 lettres, chiffres, tirets et underscores.");
      return;
    }

    const isNewUser = !editingUser.uid;

    // Simplified password validation
    if (isNewUser && !passwordInput) {
      showError("Le mot de passe est obligatoire pour un nouvel utilisateur.");
      return;
    }

    if (passwordInput) {
      if (passwordInput.length < 6) {
        showError("Le mot de passe doit contenir au moins 6 caractères.");
        return;
      }
    }

    setIsSaving(true);

    // FIX 1: Use destructuring to safely separate the uid from the payload.
    // This is the CRITICAL fix that prevents the '...uid: undefined' update error
    // and ensures the update path is taken when uid exists.
    const { uid, ...restOfUser } = editingUser;

    // Prepare user object for database operation
    const userData = {
      ...restOfUser,
      username: dbUtils.sanitizeInput(restOfUser.username),
      rawPassword: passwordInput,
      // Ensure year is set to empty string if role is admin
      year: restOfUser.role === 'student' ? restOfUser.year : '',
    };

    // Only set created_at for new users, don't update it for existing users
    if (isNewUser) {
      userData.createdAt = new Date().toISOString();
    }

    try {
      if (isNewUser) {
        // Check for existing username only when ADDING
        const existing = users.find(u => u.username.toLowerCase() === userData.username.toLowerCase());
        if (existing) {
          showError("Ce nom d'utilisateur existe déjà.");
          return;
        }
        // Add user
        await dbUtils.addUser(userData);
        showSuccess("Utilisateur ajouté avec succès !");
      } else {
        // Update user: use the extracted 'uid' and the 'userData' payload without the 'uid' field.
        if (!uid) {
          showError("Erreur interne: UID d'utilisateur manquant pour la mise à jour.");
          return;
        }
        await dbUtils.updateUser(uid, userData);
        showSuccess("Utilisateur mis à jour avec succès !");
      }

      handleModalClose();
    } catch (error) {
      showError(`Erreur lors de la sauvegarde : ${error.message || 'Veuillez réessayer.'}`);
    } finally {
      setIsSaving(false);
    }
  };


  // --- Handlers for User Actions (Toggle Status, Delete) ---

  const toggleUserStatus = async (uid, currentStatus) => {
    setTogglingUid(uid);
    try {
      await dbUtils.toggleUserStatus(uid, !currentStatus);
      showSuccess(`Statut de l'utilisateur basculé sur ${!currentStatus ? 'Actif' : 'Inactif'}.`);
    } catch (error) {
      showError("Erreur lors du changement de statut.");
    } finally {
      setTogglingUid(null);
    }
  };

  const handleDeleteUser = (uid) => {
    // FIX 3: Simplified check for a truthy UID.
    if (uid) {
      setUserToDeleteUid(uid);
      setConfirmDelete(true);
    } else {
      showError("UID invalide. Impossible de supprimer.");
    }
  };

  const confirmDeleteAction = async () => {
    // FIX 3: Check if UID is present before attempting deletion
    if (!userToDeleteUid) {
      showError("Erreur: UID de l'utilisateur à supprimer est manquant.");
      cancelDeleteAction();
      return;
    }

    setDeletingUid(userToDeleteUid);

    try {
      await dbUtils.deleteUser(userToDeleteUid);
      showSuccess("Utilisateur supprimé avec succès.");
    } catch (error) {
      showError(`Erreur lors de la suppression de l'utilisateur: ${error.message}`);
    } finally {
      setDeletingUid(null);
      setConfirmDelete(false);
      setUserToDeleteUid(null);
    }
  };

  const cancelDeleteAction = () => {
    setConfirmDelete(false);
    setUserToDeleteUid(null);
  };


  return (
    <div className="user-manager">
      <header className="user-manager-header">
        <h2>Gestion des Utilisateurs</h2>
        <button
          className="btn btn-primary"
          onClick={handleAddNewUser}
        >
          <FaUserPlus /> Ajouter un Utilisateur
        </button>
      </header>

      {/* User Cards Grid */}
      <div className="users-grid">
        {users.length === 0 ? (
          <div className="no-users-message">
            <FaUser className="no-users-icon" />
            <h3>Aucun utilisateur trouvé</h3>
            <p>Commencez par ajouter votre premier utilisateur</p>
          </div>
        ) : (
          users.map(user => {
            // Count total admin users to determine if delete button should be shown
            const adminCount = users.filter(u => u.role === 'admin').length;
            const canDeleteAdmin = user.role === 'admin' && adminCount > 1;

            return (
              <div key={user.uid} className={`user-card ${user.role === 'admin' ? 'admin-card' : 'student-card'}`}>
                <div className="user-card-header">
                  <div className="user-avatar">
                    <FaUser />
                  </div>
                  <div className="user-info">
                    <h3 className="user-name">{user.username}</h3>
                    <span className={`role-badge ${user.role}`}>
                      {user.role === 'admin' ? 'Administrateur' : 'Étudiant'}
                    </span>
                  </div>
                  {user.role !== 'admin' && (
                    <button
                      className={`status-toggle ${user.isActive ? 'active' : 'inactive'}`}
                      onClick={() => toggleUserStatus(user.uid, user.isActive)}
                      title={user.isActive ? 'Désactiver' : 'Activer'}
                      disabled={togglingUid === user.uid}
                    >
                      {togglingUid === user.uid ? (
                        <FaSpinner className="spinner" />
                      ) : (
                        user.isActive ? <FaEye /> : <FaEyeSlash />
                      )}
                    </button>
                  )}
                </div>

                <div className="user-card-body">
                  <div className="user-detail">
                    <span className="detail-label">Année d'étude</span>
                    <span className="detail-value">{user.year || 'Non spécifiée'}</span>
                  </div>
                  <div className="user-detail">
                    <span className="detail-label">Statut</span>
                    <span className={`status-indicator ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.role === 'admin' ? 'Toujours Actif' : (user.isActive ? 'Actif' : 'Inactif')}
                    </span>
                  </div>
                  <div className="user-detail">
                    <span className="detail-label">Créé le</span>
                    <span className="detail-value">{formatDate(user.created_at)}</span>
                  </div>
                </div>

                <div className="user-card-actions">
                  <button
                    className="btn btn-edit"
                    onClick={() => handleEditUser(user)}
                    title="Modifier l'utilisateur"
                  >
                    <FaEdit /> Modifier
                  </button>
                  {(user.role !== 'admin' || canDeleteAdmin) && (
                    <button
                      className="btn btn-delete"
                      onClick={() => handleDeleteUser(user.uid)}
                      title="Supprimer l'utilisateur"
                    >
                      <FaTrash /> Supprimer
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit User Modal */}
      {showAddEditModal && editingUser && ReactDOM.createPortal(
        <div className="modal-overlay" onClick={handleModalClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser.uid ? 'Modifier Utilisateur' : 'Ajouter Utilisateur'}</h2>
              <button className="modal-close" onClick={handleModalClose}><FaTimes /></button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="modal-body">

                {/* Username */}
                <div className="input-group">
                  <FaUser className="input-icon" />
                  <input
                    type="text"
                    name="username"
                    placeholder="Nom d'utilisateur"
                    required
                    value={editingUser.username}
                    onChange={handleInputChange}
                    // Prevent changing username for existing users (RTDB key)
                    disabled={!!editingUser.uid}
                    maxLength="20"
                  />
                </div>

                {/* Password (Required for Add, Optional for Edit) */}
                <div className="input-group">
                  <FaLock className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder={editingUser.uid ? 'Nouveau Mot de Passe' : 'Mot de Passe'}
                    value={passwordInput}
                    onChange={handleInputChange}
                    minLength="6"
                    required={!editingUser.uid}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>

                {/* Role Selector */}
                <div className="input-group select-group">
                  <label>Rôle</label>
                  <select
                    name="role"
                    value={editingUser.role}
                    onChange={handleInputChange}
                    required
                    disabled={editingUser.uid && editingUser.role === 'admin'}
                  >
                    {roles.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {/* Year Selector (Only for students) */}
                {editingUser.role === 'student' && (
                  <div className="input-group select-group">
                    <label>Année</label>
                    <select
                      name="year"
                      value={editingUser.year}
                      onChange={handleInputChange}
                      required
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleModalClose}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? (
                    <><FaSpinner className="spinner" /> Sauvegarde...</>
                  ) : (
                    <><FaSave /> {editingUser.uid ? 'Enregistrer' : 'Créer'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmDelete}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer l'utilisateur avec l'UID : ${userToDeleteUid || '???'}. Cette action est irréversible.`}
        onConfirm={confirmDeleteAction}
        onCancel={cancelDeleteAction}
        isLoading={deletingUid !== null}
      />
    </div>
  );
};

export default UserManager;