import React from 'react';
import ImpactMetrics from './ImpactMetrics';
import DisasterTypeBreakdown from './DisasterTypeBreakdown';
import RecentDisasters from './RecentDisasters';
import SeverityIndicator from './SeverityIndicator';
import '../../styles/dashboard.css';

const Dashboard = ({ activeDisasters, loading }) => {
  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>🚨 Live Disaster Dashboard</h2>
        <div className="last-updated">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="dashboard-grid">
        <ImpactMetrics disasters={activeDisasters} />
        <SeverityIndicator disasters={activeDisasters} />
        <DisasterTypeBreakdown disasters={activeDisasters} />
        <RecentDisasters disasters={activeDisasters} />
      </div>
    </div>
  );
};

export default Dashboard;