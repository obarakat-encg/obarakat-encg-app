import React, { useState, useEffect } from 'react';
import { FaFile, FaHdd, FaBook, FaFileAlt, FaSync } from 'react-icons/fa';
import { fileStats } from '../utils/fileStats';
import './styles/FileStats.css';

const FileStats = ({ refreshTrigger }) => {
  const [stats, setStats] = useState({
    total: { files: 0, size: 0 },
    cours: { files: 0, size: 0 },
    td: { files: 0, size: 0 }
  });
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const newStats = await fileStats.getTotalStats();
      setStats(newStats);
    } catch (error) {
      // Error loading stats - silently continue
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="file-stats-container loading">
        <div className="stats-card">
          <FaSync className="loading-icon" />
          <span>Chargement des statistiques...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="file-stats-container">
      <div className="stats-grid">
        <div className="stats-card total">
          <div className="stats-icon icon1 ">
            <FaHdd />
          </div>
          <div className="stats-content">
            <div className="stats-number">{fileStats.formatFileCount(stats.total.files)}</div>
            <div className="stats-size">{fileStats.formatSize(stats.total.size)}</div>
            <div className="stats-label">Total des fichiers</div>
          </div>
        </div>

        <div className="stats-card cours">
          <div className="stats-icon icon2 ">
            <FaBook />
          </div>
          <div className="stats-content">
            <div className="stats-number">{stats.cours.files}</div>
            <div className="stats-size">{fileStats.formatSize(stats.cours.size)}</div>
            <div className="stats-label">Cours</div>
          </div>
        </div>

        <div className="stats-card td">
          <div className="stats-icon icon3 ">
            <FaFileAlt />
          </div>
          <div className="stats-content">
            <div className="stats-number">{stats.td.files}</div>
            <div className="stats-size">{fileStats.formatSize(stats.td.size)}</div>
            <div className="stats-label">TDs</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileStats;