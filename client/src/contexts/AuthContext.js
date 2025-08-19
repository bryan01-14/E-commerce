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

  // Configurer axios avec les options par défaut
  useEffect(() => {
    axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'https://backend-beta-blond-93.vercel.app';
    axios.defaults.withCredentials = true; // Important pour les cookies de session
    
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('/api/auth/me');
        
        if (response.data.user) {
          setUser(response.data.user);
          // Mettre à jour le token si nécessaire
          if (response.data.token) {
            setToken(response.data.token);
            localStorage.setItem('token', response.data.token);
          }
        }
      } catch (error) {
        console.error('Erreur vérification auth:', error);
        if (error.response?.status === 401) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Fonction de connexion
  const login = async (credentials) => {
    try {
      const response = await axios.post('/api/auth/login', credentials);
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

  // Fonction de déconnexion
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

  // Fonction de changement de mot de passe
  const changePassword = async (passwords) => {
    try {
      await axios.post('/api/auth/change-password', passwords);
      toast.success('Mot de passe modifié avec succès');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Erreur lors du changement de mot de passe';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Fonction de mise à jour du profil
  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(`/api/users/${user._id}`, profileData);
      setUser(response.data.user);
      toast.success('Profil mis à jour avec succès');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Erreur lors de la mise à jour du profil';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    changePassword,
    updateProfile,
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