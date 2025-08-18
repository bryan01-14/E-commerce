import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Créer la connexion socket
      const newSocket = io('http://localhost:5000', {
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });

      // Événements de connexion
      newSocket.on('connect', () => {
        console.log('Connecté au serveur Socket.IO');
        setConnected(true);
        
        // Rejoindre les rooms selon le rôle
        if (user.role === 'admin') {
          newSocket.emit('join-room', 'admin');
        } else if (user.role === 'closeur') {
          newSocket.emit('join-room', `boutique-${user.boutique}`);
        } else if (user.role === 'livreur') {
          newSocket.emit('join-room', `livreur-${user._id}`);
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Déconnecté du serveur Socket.IO');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Erreur de connexion Socket.IO:', error);
        setConnected(false);
      });

      // Événements de notifications
      newSocket.on('new-order', (data) => {
        if (user.role === 'admin' || (user.role === 'closeur' && data.order.boutique === user.boutique)) {
          toast.success(`Nouvelle commande: ${data.order.numeroCommande}`);
        }
      });

      newSocket.on('order-assigned', (data) => {
        if (user.role === 'livreur' && data.order.livreurId === user._id) {
          toast.success(`Nouvelle commande attribuée: ${data.order.numeroCommande}`);
        }
      });

      newSocket.on('order-delivered', (data) => {
        if (user.role === 'admin' || (user.role === 'closeur' && data.order.boutique === user.boutique)) {
          toast.success(`Commande livrée: ${data.order.numeroCommande}`);
        }
      });

      newSocket.on('order-not-delivered', (data) => {
        if (user.role === 'admin' || (user.role === 'closeur' && data.order.boutique === user.boutique)) {
          toast.error(`Commande non livrée: ${data.order.numeroCommande}`);
        }
      });

      newSocket.on('reminder-due', (data) => {
        if (user.role === 'admin' || (user.role === 'closeur' && data.order.boutique === user.boutique)) {
          toast.warning(`Rappel: Commande ${data.order.numeroCommande} à livrer aujourd'hui`);
        }
      });

      setSocket(newSocket);

      // Nettoyer la connexion lors du démontage
      return () => {
        newSocket.close();
      };
    } else {
      // Fermer la connexion si l'utilisateur n'est pas authentifié
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [isAuthenticated, user]);

  // Fonction pour émettre des événements
  const emit = (event, data) => {
    if (socket && connected) {
      socket.emit(event, data);
    }
  };

  // Fonction pour écouter des événements
  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  // Fonction pour arrêter d'écouter un événement
  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  const value = {
    socket,
    connected,
    emit,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
