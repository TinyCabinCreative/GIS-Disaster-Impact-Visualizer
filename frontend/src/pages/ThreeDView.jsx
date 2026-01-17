import React, { useState } from 'react';
import '../styles/threedview.css';

const ThreeDView = () => {
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [renderMode, setRenderMode] = useState('terrain'); // terrain, population, disasters

  return (
    <div className="page-container threed-view">
      <div className="threed-controls">
        <h2>3D Terrain Visualization</h2>
        
        <div className="control-panel">
          <div className="control-group">
            <label>Render Mode:</label>
            <select 
              value={renderMode} 
              onChange={(e) => setRenderMode(e.target.value)}
              className="select-input"
            >
              <option value="terrain">Terrain Only</option>
              <option value="population">Population Density</option>
              <option value="disasters">Disaster Overlay</option>
              <option value="combined">Combined View</option>
            </select>
          </div>

          <div className="control-group">
            <label>Elevation Scale:</label>
            <input 
              type="range" 
              min="1" 
              max="5" 
              step="0.5" 
              defaultValue="2"
              className="slider"
            />
          </div>

          <div className="control-group">
            <label>Disaster Animation:</label>
            <div className="button-group">
              <button className="btn-control">Play</button>
              <button className="btn-control">Pause</button>
              <button className="btn-control">Reset</button>
            </div>
          </div>
        </div>

        <div className="legend">
          <h4>Legend</h4>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#FF4500' }}></span>
            <span>Wildfires</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#FF8C00' }}></span>
            <span>Earthquakes</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#4169E1' }}></span>
            <span>Floods</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#00FF00' }}></span>
            <span>Low Population</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#FFFF00' }}></span>
            <span>Medium Population</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#FF0000' }}></span>
            <span>High Population</span>
          </div>
        </div>
      </div>

      <div className="threed-canvas-container">
        <div className="canvas-placeholder">
          <div className="placeholder-content">
            <h3>🗻 3D Terrain Renderer</h3>
            <p>Three.js visualization will be rendered here</p>
            <div className="placeholder-features">
              <div className="feature-item">✓ Interactive 3D terrain with elevation data</div>
              <div className="feature-item">✓ Population density height maps</div>
              <div className="feature-item">✓ Animated disaster progression</div>
              <div className="feature-item">✓ Real-time particle effects</div>
              <div className="feature-item">✓ Camera flythrough controls</div>
            </div>
            <p className="note">
              This will integrate Three.js with React Three Fiber for WebGL rendering
            </p>
          </div>
        </div>
      </div>

      {selectedDisaster && (
        <div className="disaster-info-panel">
          <h3>Selected Disaster</h3>
          <div className="info-content">
            <p><strong>Type:</strong> {selectedDisaster.type}</p>
            <p><strong>Severity:</strong> {selectedDisaster.severity}</p>
            <p><strong>Location:</strong> {selectedDisaster.name}</p>
          </div>
        </div>
      )}

      <div className="camera-info">
        <span>Camera Position: X: 0.00, Y: 0.00, Z: 100.00</span>
        <span>|</span>
        <span>FPS: 60</span>
      </div>
    </div>
  );
};

export default ThreeDView;