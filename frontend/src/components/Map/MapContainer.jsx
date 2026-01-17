import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { fetchDisastersInBounds } from '../../services/disasterService';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const MapContainer = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(-95.7);
  const [lat, setLat] = useState(45.5);
  const [zoom, setZoom] = useState(3.5);
  const [disasters, setDisasters] = useState([]);

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [lng, lat],
      zoom: zoom
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add scale control
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    // Update coordinates on move
    map.current.on('move', () => {
      setLng(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
    });

    // Load disasters when map loads
    map.current.on('load', () => {
      loadDisasters();
      
      // Add disaster layers
      addDisasterLayers();
    });

    // Reload disasters when map moves
    map.current.on('moveend', () => {
      loadDisasters();
    });

  }, []);

  const loadDisasters = async () => {
    try {
      const bounds = map.current.getBounds();
      const data = await fetchDisastersInBounds({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      });

      setDisasters(data);
      updateDisasterMarkers(data);
    } catch (error) {
      console.error('Error loading disasters:', error);
    }
  };

  const addDisasterLayers = () => {
    // Add source for disasters
    map.current.addSource('disasters', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    // Add earthquake layer
    map.current.addLayer({
      id: 'earthquakes',
      type: 'circle',
      source: 'disasters',
      filter: ['==', ['get', 'type'], 'earthquake'],
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'magnitude'],
          2, 4,
          5, 10,
          7, 20
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'magnitude'],
          2, '#FFD700',
          5, '#FF8C00',
          7, '#FF0000'
        ],
        'circle-opacity': 0.7,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FFFFFF'
      }
    });

    // Add wildfire layer
    map.current.addLayer({
      id: 'wildfires',
      type: 'circle',
      source: 'disasters',
      filter: ['==', ['get', 'type'], 'wildfire'],
      paint: {
        'circle-radius': 8,
        'circle-color': '#FF4500',
        'circle-opacity': 0.8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FFD700'
      }
    });

    // Add click handlers
    map.current.on('click', 'earthquakes', (e) => {
      showDisasterPopup(e);
    });

    map.current.on('click', 'wildfires', (e) => {
      showDisasterPopup(e);
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'earthquakes', () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', 'earthquakes', () => {
      map.current.getCanvas().style.cursor = '';
    });
  };

  const updateDisasterMarkers = (disasterData) => {
    if (!map.current.getSource('disasters')) return;

    const features = disasterData.map(disaster => ({
      type: 'Feature',
      geometry: disaster.centroid || disaster.geometry,
      properties: {
        id: disaster.id,
        type: disaster.type,
        name: disaster.name,
        severity: disaster.severity,
        magnitude: disaster.magnitude,
        temperature: disaster.temperature_celsius,
        startTime: disaster.start_time
      }
    }));

    map.current.getSource('disasters').setData({
      type: 'FeatureCollection',
      features
    });
  };

  const showDisasterPopup = (e) => {
    const properties = e.features[0].properties;
    
    let description = `
      <div class="disaster-popup">
        <h3>${properties.type.toUpperCase()}</h3>
        <p><strong>${properties.name}</strong></p>
        <p><strong>Severity:</strong> ${properties.severity}</p>
    `;

    if (properties.magnitude) {
      description += `<p><strong>Magnitude:</strong> ${properties.magnitude}</p>`;
    }

    if (properties.temperature) {
      description += `<p><strong>Temperature:</strong> ${properties.temperature}°C</p>`;
    }

    description += `
        <p><strong>Time:</strong> ${new Date(properties.startTime).toLocaleString()}</p>
        <button onclick="window.viewDisasterDetails(${properties.id})">View Details</button>
      </div>
    `;

    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(description)
      .addTo(map.current);
  };

  // Global function for popup button
  window.viewDisasterDetails = (id) => {
    console.log('View details for disaster:', id);
    // TODO: Navigate to detail view
  };

  return (
    <div className="map-container-wrapper">
      <div className="map-info">
        <div>Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}</div>
        <div>Active Disasters: {disasters.length}</div>
      </div>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
};

export default MapContainer;