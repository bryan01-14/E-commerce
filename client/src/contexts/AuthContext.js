// contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
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

  // L'instance API gère déjà baseURL, withCredentials et le token via intercepteur

  const checkAuth = async () => {
    try {
      // Ne pas appeler l'API s'il n'y a pas de token (évite un 401 au chargement)
      const existingToken = localStorage.getItem('token');
      if (!existingToken) {
        setUser(null);
        return;
      }

      // Vérifier d'abord avec le token
      const response = await api.get('/auth/me');
      
      if (response.data.user) {
        setUser(response.data.user);
        if (response.data.token) {
          const newToken = response.data.token;
          setToken(newToken);
          localStorage.setItem('token', newToken);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Erreur vérification auth:', error);
      }
      
      // Si erreur 401, tenter une récupération de session
      if (error.response?.status === 401) {
        try {
          const sessionResponse = await api.get('/auth/session');
          if (sessionResponse.data.userId) {
            // Si session valide, relancer la vérification auth
            await checkAuth();
            return;
          }
        } catch (sessionError) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Session invalide:', sessionError);
          }
        }
        
        // Nettoyer les données d'authentification invalides
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
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
      const response = await api.post('/auth/login', credentials);
      const { user, token } = response.data;
      
      setUser(user);
      setToken(token);
      localStorage.setItem('token', token);
      
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
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Erreur lors de la déconnexion API:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
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