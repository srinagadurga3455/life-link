import apiClient from './apiClient';

// Auth APIs
export const registerUser = (name, phone, password) => {
  return apiClient.post('/auth/register', { name, phone, password });
};

export const loginUser = (phone, password) => {
  return apiClient.post('/auth/login', { phone, password });
};

// User Profile APIs
export const getUserProfile = () => {
  return apiClient.get('/user/profile');
};

export const updateUserProfile = (profileData) => {
  return apiClient.put('/user/profile', profileData);
};

// Emergency Contact APIs
export const createContact = (name, phone, priority, tag) => {
  return apiClient.post('/contacts', { name, phone, priority, tag });
};

export const getContacts = () => {
  return apiClient.get('/contacts');
};

export const updateContact = (id, name, phone, priority, tag) => {
  return apiClient.put(`/contacts/${id}`, { name, phone, priority, tag });
};

export const deleteContact = (id) => {
  return apiClient.delete(`/contacts/${id}`);
};

// Emergency APIs
export const triggerEmergency = (type, latitude, longitude) => {
  return apiClient.post('/emergency/trigger', { type, latitude, longitude });
};

export const getEmergencyHistory = () => {
  return apiClient.get('/emergency/history');
};

export const updateEmergencyStatus = (id, status) => {
  return apiClient.put(`/emergency/status/${id}`, { status });
};
