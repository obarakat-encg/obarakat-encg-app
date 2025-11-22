import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaUsers, FaBook, FaFileAlt, FaSignOutAlt, FaHome, FaCalendarAlt } from "react-icons/fa";
import { Context } from "./context";
import FileManagerV2 from "./FileManagerV2";
import UserManager from "./UserManager";
import SeminarManager from "./SeminarManager";
// import FileStats from "./FileStats"; // Disabled - Storage not configured
import "./styles/dashboard.css";

const Dashboard = () => {
  const { logout } = useContext(Context);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('courses');
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);

  const handleLogout = () => {
    logout();
  };

  const tabs = [
    { id: 'courses', label: 'Cours', icon: <FaBook /> },
    { id: 'tds', label: 'TDs', icon: <FaFileAlt /> },
    { id: 'seminars', label: 'Séminaires', icon: <FaCalendarAlt /> },
    { id: 'users', label: 'Utilisateurs', icon: <FaUsers /> }
  ];


  const handleFileChange = () => {
    // Trigger stats refresh when files are added or deleted
    setStatsRefreshTrigger(prev => prev + 1);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'courses':
        return <FileManagerV2 type="cours" title="Cours" onFileChange={handleFileChange} />;
      case 'tds':
        return <FileManagerV2 type="td" title="TDs" onFileChange={handleFileChange} />;
      case 'seminars':
        return <SeminarManager />;
      case 'users':
        return <UserManager />;
      default:
        return null;
    }
  };

  return (
    <motion.div 
      className="dashboard-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut'}}
    >
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Tableau de Bord Admin</h1>
          <p>Bienvenue, Administrateur</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            <FaHome /> Accueil
          </button>
          <button className="btn btn-danger" onClick={handleLogout}>
            <FaSignOutAlt /> Déconnexion
          </button>
        </div>
      </div>

      <div className="dashboard-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* <FileStats refreshTrigger={statsRefreshTrigger} /> */}

      <div className="dashboard-content">
        {renderTabContent()}
      </div>
    </motion.div>
  );
};

export default Dashboard;
