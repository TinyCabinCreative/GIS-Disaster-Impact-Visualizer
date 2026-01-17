import api from './api';

/**
 * Disaster Service
 * Handles all disaster-related API calls
 */

export const fetchDisasters = async (filters = {}) => {
  try {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/disasters?${params}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching disasters:', error);
    throw error;
  }
};

export const fetchDisasterById = async (id) => {
  try {
    const response = await api.get(`/disasters/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching disaster:', error);
    throw error;
  }
};

export const fetchDisasterImpact = async (id) => {
  try {
    const response = await api.get(`/disasters/${id}/impact`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching disaster impact:', error);
    throw error;
  }
};

export const fetchDisastersInBounds = async (bounds) => {
  try {
    const params = new URLSearchParams(bounds);
    const response = await api.get(`/disasters/search/bounds?${params}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching disasters in bounds:', error);
    throw error;
  }
};

export const fetchActiveDisasters = async () => {
  try {
    const response = await api.get('/disasters/active/all');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching active disasters:', error);
    throw error;
  }
};

export const fetchDisastersByType = async (type, limit = 50) => {
  try {
    const response = await api.get(`/disasters/type/${type}?limit=${limit}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching disasters by type:', error);
    throw error;
  }
};