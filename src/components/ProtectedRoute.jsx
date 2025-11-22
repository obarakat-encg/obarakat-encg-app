import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Context } from './context';
import './styles/loading.css';

// Main ProtectedRoute component that handles different protection levels
const ProtectedRoute = ({ children, requireAdmin = false, requireLogin = true }) => {
  const { role, isLoading } = useContext(Context);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Chargement...</div>
        <div className="loading-dots">
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
        </div>
      </div>
    );
  }

  // If requireLogin is false (for login page), redirect authenticated users
  if (!requireLogin) {
    if (role === 'admin') {
      return <Navigate to="/dashboard" replace />;
    } else if (role) {
      return <Navigate to="/" replace />;
    }
    return children;
  }

  // If admin is required
  if (requireAdmin) {
    if (role !== 'admin') {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
  }

  // If login is required but not admin
  if (requireLogin && !role) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Named exports for specific use cases
export const AdminRoute = ({ children }) => (
  <ProtectedRoute requireAdmin={true}>{children}</ProtectedRoute>
);

export const AuthenticatedRoute = ({ children }) => (
  <ProtectedRoute requireLogin={true}>{children}</ProtectedRoute>
);

export const PublicRoute = ({ children }) => (
  <ProtectedRoute requireLogin={false}>{children}</ProtectedRoute>
);

// Default export
export default ProtectedRoute;