import React, { useState, useEffect } from 'react';
import MapContainer from '../components/Map/MapContainer';
import Sidebar from '../components/UI/Sidebar';
import Dashboard from '../components/Dashboard/Dashboard';
import { fetchActiveDisasters } from '../services/disasterService';

const MapView = () => {
  const [showDashboard, setShowDashboard] = useState(true);
  const [activeDisasters, setActiveDisasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    types: [],
    severity: []
  });

  useEffect(() => {
    loadActiveDisasters();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadActiveDisasters, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadActiveDisasters = async () => {
    try {
      const data = await fetchActiveDisasters();
      setActiveDisasters(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading active disasters:', error);
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="map-view">
      <Sidebar 
        filters={filters}
        onFilterChange={handleFilterChange}
        activeDisasters={activeDisasters}
      />
      
      <div className="map-main-content">
        {showDashboard && (
          <Dashboard 
            activeDisasters={activeDisasters}
            loading={loading}
          />
        )}
        
        <MapContainer filters={filters} />
      </div>
      
      <button 
        className="toggle-dashboard-btn"
        onClick={() => setShowDashboard(!showDashboard)}
      >
        {showDashboard ? '📊 Hide Dashboard' : '📊 Show Dashboard'}
      </button>
    </div>
  );
};

export default MapView;