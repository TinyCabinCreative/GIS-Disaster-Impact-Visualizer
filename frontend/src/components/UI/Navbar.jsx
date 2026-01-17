import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/globals.css';

const Navbar = ({ activeView, setActiveView }) => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>🌍 Disaster Impact Visualizer</h1>
        <p className="tagline">Real-time North American Disaster Monitoring</p>
      </div>
      
      <div className="navbar-links">
        <Link 
          to="/" 
          className={activeView === 'map' ? 'active' : ''}
          onClick={() => setActiveView('map')}
        >
          📍 2D Map
        </Link>
        <Link 
          to="/3d" 
          className={activeView === '3d' ? 'active' : ''}
          onClick={() => setActiveView('3d')}
        >
          🗻 3D Terrain
        </Link>
        <Link 
          to="/analytics" 
          className={activeView === 'analytics' ? 'active' : ''}
          onClick={() => setActiveView('analytics')}
        >
          📊 Analytics
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;