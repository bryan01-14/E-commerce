// client/src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: "https://backend-beta-blond-93.vercel.app/api" || 'http://localhost:5000/api',
  withCredentials: true // Pour les cookies de session
});

// Intercepteur pour ajouter le token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Gérer la déconnexion ici
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;