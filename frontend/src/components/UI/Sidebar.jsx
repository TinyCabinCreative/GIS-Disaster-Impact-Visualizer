import React, { useState } from 'react';
import '../../styles/sidebar.css';

const Sidebar = ({ filters, onFilterChange, activeDisasters }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedSeverity, setSelectedSeverity] = useState([]);

  const disasterTypes = [
    { value: 'earthquake', label: '🌍 Earthquake', color: '#FF8C00' },
    { value: 'wildfire', label: '🔥 Wildfire', color: '#FF4500' },
    { value: 'flood', label: '🌊 Flood', color: '#4169E1' },
    { value: 'hurricane', label: '🌀 Hurricane', color: '#8B008B' },
    { value: 'tornado', label: '🌪️ Tornado', color: '#DC143C' },
    { value: 'severe_weather', label: '⛈️ Severe Weather', color: '#FFD700' },
    { value: 'winter_storm', label: '❄️ Winter Storm', color: '#87CEEB' },
    { value: 'drought', label: '🏜️ Drought', color: '#D2691E' }
  ];

  const severityLevels = [
    { value: 'minor', label: 'Minor', color: '#4CAF50' },
    { value: 'moderate', label: 'Moderate', color: '#FFC107' },
    { value: 'severe', label: 'Severe', color: '#FF9800' },
    { value: 'extreme', label: 'Extreme', color: '#F44336' }
  ];

  const handleTypeToggle = (type) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    
    setSelectedTypes(newTypes);
    onFilterChange({ ...filters, types: newTypes });
  };

  const handleSeverityToggle = (severity) => {
    const newSeverity = selectedSeverity.includes(severity)
      ? selectedSeverity.filter(s => s !== severity)
      : [...selectedSeverity, severity];
    
    setSelectedSeverity(newSeverity);
    onFilterChange({ ...filters, severity: newSeverity });
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedSeverity([]);
    onFilterChange({ types: [], severity: [] });
  };

  const countByType = (type) => {
    return activeDisasters.filter(d => d.type === type).length;
  };

  const countBySeverity = (severity) => {
    return activeDisasters.filter(d => d.severity === severity).length;
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="sidebar-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? '→' : '←'}
      </button>

      {!isCollapsed && (
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h3>🔍 Filters</h3>
            {(selectedTypes.length > 0 || selectedSeverity.length > 0) && (
              <button className="btn-clear" onClick={clearFilters}>
                Clear All
              </button>
            )}
          </div>

          {/* Disaster Types */}
          <div className="filter-section">
            <h4>Disaster Type</h4>
            <div className="filter-list">
              {disasterTypes.map(type => {
                const count = countByType(type.value);
                const isSelected = selectedTypes.includes(type.value);
                
                return (
                  <label 
                    key={type.value}
                    className={`filter-item ${isSelected ? 'selected' : ''} ${count === 0 ? 'disabled' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleTypeToggle(type.value)}
                      disabled={count === 0}
                    />
                    <span className="filter-label">
                      {type.label}
                    </span>
                    <span className="filter-count">
                      ({count})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Severity Levels */}
          <div className="filter-section">
            <h4>Severity Level</h4>
            <div className="filter-list">
              {severityLevels.map(severity => {
                const count = countBySeverity(severity.value);
                const isSelected = selectedSeverity.includes(severity.value);
                
                return (
                  <label 
                    key={severity.value}
                    className={`filter-item ${isSelected ? 'selected' : ''} ${count === 0 ? 'disabled' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSeverityToggle(severity.value)}
                      disabled={count === 0}
                    />
                    <span 
                      className="severity-indicator"
                      style={{ backgroundColor: severity.color }}
                    />
                    <span className="filter-label">
                      {severity.label}
                    </span>
                    <span className="filter-count">
                      ({count})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Active Filters Summary */}
          {(selectedTypes.length > 0 || selectedSeverity.length > 0) && (
            <div className="active-filters-summary">
              <h4>Active Filters</h4>
              <div className="filter-tags">
                {selectedTypes.map(type => (
                  <span key={type} className="filter-tag">
                    {disasterTypes.find(t => t.value === type)?.label}
                    <button onClick={() => handleTypeToggle(type)}>×</button>
                  </span>
                ))}
                {selectedSeverity.map(severity => (
                  <span key={severity} className="filter-tag">
                    {severityLevels.find(s => s.value === severity)?.label}
                    <button onClick={() => handleSeverityToggle(severity)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats Summary */}
          <div className="sidebar-stats">
            <div className="stat-item">
              <span className="stat-label">Total Active:</span>
              <span className="stat-value">{activeDisasters.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Filtered:</span>
              <span className="stat-value">
                {selectedTypes.length > 0 || selectedSeverity.length > 0 
                  ? 'Yes' 
                  : 'No'
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;