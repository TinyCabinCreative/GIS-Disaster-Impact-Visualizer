import React from 'react';
import '../../styles/dashboard.css';

const ImpactMetrics = ({ disasters }) => {
  // Calculate aggregate metrics
  const totalDisasters = disasters.length;
  
  const severeCount = disasters.filter(d => 
    d.severity === 'severe' || d.severity === 'extreme'
  ).length;
  
  const earthquakes = disasters.filter(d => d.type === 'earthquake');
  const wildfires = disasters.filter(d => d.type === 'wildfire');
  
  const highestMagnitude = earthquakes.length > 0
    ? Math.max(...earthquakes.map(e => e.magnitude || 0))
    : 0;

  const getTrendIndicator = (value) => {
    // Simplified trend - in production you'd compare with historical data
    if (value > 10) return '↑ High';
    if (value > 5) return '→ Moderate';
    return '↓ Low';
  };

  return (
    <div className="dashboard-card impact-metrics">
      <h3>📊 Impact Metrics</h3>
      
      <div className="metrics-grid">
        <div className="metric-item">
          <div className="metric-value">{totalDisasters}</div>
          <div className="metric-label">Active Disasters</div>
          <div className="metric-trend">{getTrendIndicator(totalDisasters)}</div>
        </div>

        <div className="metric-item alert">
          <div className="metric-value">{severeCount}</div>
          <div className="metric-label">Severe/Extreme</div>
          <div className="metric-trend">{severeCount > 3 ? '⚠️ Critical' : '✓ Normal'}</div>
        </div>

        <div className="metric-item">
          <div className="metric-value">{earthquakes.length}</div>
          <div className="metric-label">Earthquakes</div>
          <div className="metric-detail">
            {highestMagnitude > 0 && `Max: ${highestMagnitude.toFixed(1)}`}
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-value">{wildfires.length}</div>
          <div className="metric-label">Wildfires</div>
          <div className="metric-detail">
            {wildfires.length > 0 && 'Active fires detected'}
          </div>
        </div>
      </div>

      <div className="metrics-summary">
        <p>
          <strong>Status:</strong> 
          {severeCount > 5 
            ? ' 🔴 Multiple severe events active' 
            : severeCount > 2 
              ? ' 🟡 Elevated disaster activity' 
              : ' 🟢 Normal activity levels'
          }
        </p>
      </div>
    </div>
  );
};

export default ImpactMetrics;