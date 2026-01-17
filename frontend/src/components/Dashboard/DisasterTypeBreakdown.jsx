import React from 'react';
import '../../styles/dashboard.css';

const DisasterTypeBreakdown = ({ disasters }) => {
  // Count disasters by type
  const typeCounts = disasters.reduce((acc, disaster) => {
    const type = disaster.type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // Sort by count
  const sortedTypes = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6); // Top 6 types

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

  const typeColors = {
    earthquake: '#FF8C00',
    wildfire: '#FF4500',
    flood: '#4169E1',
    hurricane: '#8B008B',
    tornado: '#DC143C',
    severe_weather: '#FFD700',
    winter_storm: '#87CEEB',
    drought: '#D2691E'
  };

  const total = disasters.length || 1;

  return (
    <div className="dashboard-card type-breakdown">
      <h3>📋 Disaster Types</h3>
      
      {sortedTypes.length === 0 ? (
        <div className="no-data">No active disasters</div>
      ) : (
        <div className="type-list">
          {sortedTypes.map(([type, count]) => {
            const percentage = ((count / total) * 100).toFixed(1);
            const displayName = type.replace('_', ' ').toUpperCase();
            
            return (
              <div key={type} className="type-item">
                <div className="type-header">
                  <span className="type-icon">{typeIcons[type] || '⚠️'}</span>
                  <span className="type-name">{displayName}</span>
                  <span className="type-count">{count}</span>
                </div>
                
                <div className="type-bar-container">
                  <div 
                    className="type-bar"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: typeColors[type] || '#4fc3f7'
                    }}
                  />
                </div>
                
                <div className="type-percentage">{percentage}%</div>
              </div>
            );
          })}
        </div>
      )}

      {sortedTypes.length > 0 && (
        <div className="breakdown-summary">
          <p>
            <strong>Most Common:</strong> {
              sortedTypes[0][0].replace('_', ' ').toUpperCase()
            } ({sortedTypes[0][1]} events)
          </p>
        </div>
      )}
    </div>
  );
};

export default DisasterTypeBreakdown;