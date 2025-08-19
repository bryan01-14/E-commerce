// contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Configuration axios
  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL || 'https://backend-beta-blond-93.vercel.app';
    axios.defaults.baseURL = API_URL;
    axios.defaults.withCredentials = true;
    
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

// contexts/AuthContext.js
const checkAuth = async () => {
  try {
    const response = await axios.get('/api/auth/me');
    
    if (response.data.user) {
      setUser(response.data.user);
      if (response.data.token) {
        const newToken = response.data.token;
        setToken(newToken);
        localStorage.setItem('token', newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      }
    }
  } catch (error) {
    console.error('Erreur vérification auth:', error);
    if (error.response?.status === 401) {
      // Nettoyer les données d'authentification invalides
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    }
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await axios.post('/api/auth/login', credentials);
      const { user, token } = response.data;
      
      setUser(user);
      setToken(token);
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      toast.success('Connexion réussie');
      return { success: true };
    } catch (error) {
      console.error('Erreur de connexion:', error);
      const message = error.response?.data?.error || 'Erreur de connexion';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Erreur lors de la déconnexion API:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      toast.success('Déconnexion réussie');
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isCloseur: user?.role === 'closeur',
    isLivreur: user?.role === 'livreur',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};