import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import '../../styles/dashboard.css';

const RecentDisasters = ({ disasters }) => {
  // Sort by start time (most recent first)
  const sortedDisasters = [...disasters]
    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
    .slice(0, 5); // Top 5 most recent

  const severityColors = {
    minor: '#4CAF50',
    moderate: '#FFC107',
    severe: '#FF9800',
    extreme: '#F44336'
  };

  const typeIcons = {
    earthquake: '🌍',
    wildfire: '🔥',
    flood: '🌊',
    hurricane: '🌀',
    tornado: '🌪️',
    severe_weather: '⛈️',
    winter_storm: '❄️',
    drought: '🏜️'
  };

  const getTimeAgo = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="dashboard-card recent-disasters">
      <h3>🕐 Recent Disasters</h3>
      
      {sortedDisasters.length === 0 ? (
        <div className="no-data">No recent disasters</div>
      ) : (
        <div className="disaster-list">
          {sortedDisasters.map((disaster) => (
            <div key={disaster.id} className="disaster-item">
              <div className="disaster-icon">
                {typeIcons[disaster.type] || '⚠️'}
              </div>
              
              <div className="disaster-info">
                <div className="disaster-name">{disaster.name}</div>
                <div className="disaster-meta">
                  <span className="disaster-type">
                    {disaster.type.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="disaster-separator">•</span>
                  <span className="disaster-time">
                    {getTimeAgo(disaster.start_time)}
                  </span>
                </div>
                
                {disaster.magnitude && (
                  <div className="disaster-detail">
                    Magnitude: {disaster.magnitude.toFixed(1)}
                  </div>
                )}
                
                {disaster.temperature_celsius && (
                  <div className="disaster-detail">
                    Temp: {disaster.temperature_celsius.toFixed(0)}°C
                  </div>
                )}
              </div>
              
              <div 
                className="disaster-severity"
                style={{ backgroundColor: severityColors[disaster.severity] || '#gray' }}
              >
                {disaster.severity?.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="view-all">
        <button className="btn-link">View All Disasters →</button>
      </div>
    </div>
  );
};

export default RecentDisasters;