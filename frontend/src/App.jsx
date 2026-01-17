import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/UI/Navbar';
import MapView from './pages/MapView';
import ThreeDView from './pages/ThreeDView';
import Analytics from './pages/Analytics';
import './styles/globals.css';

function App() {
  const [activeView, setActiveView] = useState('map');

  return (
    <Router>
      <div className="app">
        <Navbar activeView={activeView} setActiveView={setActiveView} />
        
        <Routes>
          <Route path="/" element={<MapView />} />
          <Route path="/3d" element={<ThreeDView />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;