import React from 'react';
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Context } from './context';
import './styles/LoginRequiredModal.css';

const LoginRequiredModal = ({ isOpen, onClose, actionType = 'download' }) => {
  const { role } = useContext(Context);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogin = () => {
    onClose();
    navigate('/login');
  };

  const actionText = actionType === 'download' ? 'télécharger' : 'prévisualiser';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Connexion requise</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="login-icon">
            <i className="fas fa-lock"></i>
          </div>
          <p>
            Vous devez être connecté pour {actionText} ce fichier.
          </p>
          <p>
            Connectez-vous avec votre compte étudiant pour accéder aux ressources.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={handleLogin}>
            Se connecter
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginRequiredModal;
