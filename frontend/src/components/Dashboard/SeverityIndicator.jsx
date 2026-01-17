import React from 'react';
import '../../styles/dashboard.css';

const SeverityIndicator = ({ disasters }) => {
  // Count by severity
  const severityCounts = disasters.reduce((acc, disaster) => {
    const severity = disaster.severity || 'unknown';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {});

  const severityLevels = [
    { level: 'extreme', color: '#F44336', label: 'Extreme' },
    { level: 'severe', color: '#FF9800', label: 'Severe' },
    { level: 'moderate', color: '#FFC107', label: 'Moderate' },
    { level: 'minor', color: '#4CAF50', label: 'Minor' }
  ];

  const total = disasters.length || 1;

  // Calculate overall risk score (0-100)
  const riskScore = Math.min(100, Math.round(
    ((severityCounts.extreme || 0) * 4 +
     (severityCounts.severe || 0) * 3 +
     (severityCounts.moderate || 0) * 2 +
     (severityCounts.minor || 0) * 1) / total * 25
  ));

  const getRiskLevel = (score) => {
    if (score >= 75) return { level: 'Critical', color: '#F44336', icon: '🔴' };
    if (score >= 50) return { level: 'High', color: '#FF9800', icon: '🟠' };
    if (score >= 25) return { level: 'Elevated', color: '#FFC107', icon: '🟡' };
    return { level: 'Low', color: '#4CAF50', icon: '🟢' };
  };

  const currentRisk = getRiskLevel(riskScore);

  return (
    <div className="dashboard-card severity-indicator">
      <h3>⚠️ Severity Analysis</h3>
      
      {/* Overall Risk Score */}
      <div className="risk-score-container">
        <div className="risk-score-circle">
          <svg viewBox="0 0 100 100" className="risk-circle-svg">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#2a3f5f"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={currentRisk.color}
              strokeWidth="8"
              strokeDasharray={`${riskScore * 2.827} 282.7`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="risk-score-value">
            <div className="score">{riskScore}</div>
            <div className="score-label">Risk Score</div>
          </div>
        </div>
        
        <div className="risk-level">
          <span className="risk-icon">{currentRisk.icon}</span>
          <span className="risk-text" style={{ color: currentRisk.color }}>
            {currentRisk.level} Risk
          </span>
        </div>
      </div>

      {/* Severity Breakdown */}
      <div className="severity-breakdown">
        {severityLevels.map(({ level, color, label }) => {
          const count = severityCounts[level] || 0;
          const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
          
          return (
            <div key={level} className="severity-row">
              <div className="severity-label">
                <span 
                  className="severity-dot"
                  style={{ backgroundColor: color }}
                />
                <span>{label}</span>
              </div>
              
              <div className="severity-bar-wrapper">
                <div 
                  className="severity-bar"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: color
                  }}
                />
              </div>
              
              <div className="severity-value">{count}</div>
            </div>
          );
        })}
      </div>

      {/* Alert Message */}
      {severityCounts.extreme > 0 && (
        <div className="severity-alert">
          <strong>⚠️ Alert:</strong> {severityCounts.extreme} extreme-level disaster
          {severityCounts.extreme > 1 ? 's' : ''} detected
        </div>
      )}

      {disasters.length === 0 && (
        <div className="no-data">No active disasters to analyze</div>
      )}
    </div>
  );
};

export default SeverityIndicator;