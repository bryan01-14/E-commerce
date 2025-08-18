import axios from 'axios';

const api = axios.create({
  baseURL: 'https://backend-beta-blond-93.vercel.app/api',
  timeout: 8000,
  withCredentials: true , // 8 secondes
  headers: {
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour erreurs spécifiques
api.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({ 
        message: "La requête a pris trop de temps" 
      });
    }
    return Promise.reject(error);
  }
);

export default api;