import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaExclamationTriangle, FaInfo } from 'react-icons/fa';
import './styles/Notification.css';

const Notification = ({ message, type = 'success', duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isVisible) return;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          setIsVisible(false);
          onClose?.();
          return 0;
        }
        return prev - (100 / (duration / 50));
      });
    }, 50);

    return () => clearInterval(timer);
  }, [isVisible, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheck />;
      case 'error':
        return <FaTimes />;
      case 'warning':
        return <FaExclamationTriangle />;
      case 'info':
        return <FaInfo />;
      default:
        return <FaCheck />;
    }
  };

  const getMessage = () => {
    switch (type) {
      case 'success':
        return message || 'Opération réussie !';
      case 'error':
        return message || 'Une erreur est survenue';
      case 'warning':
        return message || 'Attention';
      case 'info':
        return message || 'Information';
      default:
        return message;
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`notification notification-${type}`}>
      <div className="notification-content">
        <div className="notification-icon">
          {getIcon()}
        </div>
        <div className="notification-message">
          {getMessage()}
        </div>
        <button 
          className="notification-close"
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
        >
          <FaTimes />
        </button>
      </div>
      <div className="notification-progress">
        <div 
          className="notification-progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default Notification;
