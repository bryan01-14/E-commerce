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

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Configurer le token dans les headers
        api.defaults.headers.Authorization = `Bearer ${token}`;
        
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        console.error('Erreur vérification auth:', error);
        
        // Nettoyer en cas d'erreur
        localStorage.removeItem('token');
        delete api.defaults.headers.Authorization;
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { user, token } = response.data;
      
      // Stocker le token
      localStorage.setItem('token', token);
      api.defaults.headers.Authorization = `Bearer ${token}`;
      
      setUser(user);
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
      // Nettoyer quoi qu'il arrive
      localStorage.removeItem('token');
      delete api.defaults.headers.Authorization;
      setUser(null);
      toast.success('Déconnexion réussie');
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
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