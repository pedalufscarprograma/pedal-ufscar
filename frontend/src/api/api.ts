import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://pedal-ufscar.onrender.com',
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('@pedal_token') ||
    localStorage.getItem('public_access_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});