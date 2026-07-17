import axios from 'axios';

export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    'https://pedal-ufscar-backend-diug.onrender.com',
});

api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('@pedal_token');
  const publicToken = localStorage.getItem('public_access_token');

  const token = adminToken || publicToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});