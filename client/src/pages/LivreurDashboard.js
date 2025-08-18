import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  Package, 
  MapPin, 
  Phone, 
  User, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Truck
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const LivreurDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    pending: 0,
    failed: 0
  });

  // Récupérer les commandes attribuées au livreur
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/orders/livreur/${user._id}`);
      const ordersData = response.data.orders || [];
      setOrders(ordersData);
      
      // Calculer les statistiques
      const statsData = {
        total: ordersData.length,
        delivered: ordersData.filter(order => order.status === 'livré').length,
        pending: ordersData.filter(order => order.status === 'en_cours').length,
        failed: ordersData.filter(order => order.status === 'non_livré').length
      };
      setStats(statsData);
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes:', error);
      toast.error('Erreur lors de la récupération des commandes');
    } finally {
      setLoading(false);
    }
  }, [user._id]);

  // Mettre à jour le statut d'une commande
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`/api/orders/${orderId}/status`, {
        status: newStatus,
        livreurId: user._id
      });
      
      toast.success(`Commande marquée comme ${newStatus === 'livré' ? 'livrée' : 'non livrée'}`);
      fetchOrders(); // Recharger les données
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  // Écouter les mises à jour en temps réel
  useEffect(() => {
    if (socket) {
      socket.on('orderUpdated', (updatedOrder) => {
        setOrders(prev => {
          const index = prev.findIndex(order => order._id === updatedOrder._id);
          if (index !== -1) {
            const newOrders = [...prev];
            newOrders[index] = updatedOrder;
            return newOrders;
          }
          return prev;
        });
      });

      socket.on('newOrderAssigned', (newOrder) => {
        if (newOrder.livreurId === user._id) {
          setOrders(prev => [newOrder, ...prev]);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('orderUpdated');
        socket.off('newOrderAssigned');
      }
    };
  }, [socket, user._id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'livré': return 'bg-green-100 text-green-800';
      case 'en_cours': return 'bg-blue-100 text-blue-800';
      case 'non_livré': return 'bg-red-100 text-red-800';
      case 'en_attente': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'livré': return 'Livré';
      case 'en_cours': return 'En cours de livraison';
      case 'non_livré': return 'Non livré';
      case 'en_attente': return 'En attente';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tableau de bord - Livreur
          </h1>
          <p className="text-gray-600">
            Bonjour {user.prenom} {user.nom}, voici vos commandes du jour
          </p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Livrées</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.delivered}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">En cours</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Non livrées</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.failed}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des commandes */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Commandes attribuées ({orders.length})
            </h2>
          </div>

          {orders.length === 0 ? (
            <div className="p-8 text-center">
              <Truck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune commande attribuée
              </h3>
              <p className="text-gray-500">
                Vous n'avez pas encore de commandes à livrer aujourd'hui.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {orders.map((order) => (
                <div key={order._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                        <span className="text-sm text-gray-500">
                          Commande #{order.numeroCommande}
                        </span>
                        <span className="text-sm text-gray-500">
                          {format(new Date(order.dateCommande), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Informations client</h4>
                          <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <User className="h-4 w-4 mr-2" />
                              {order.clientNom} {order.clientPrenom}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="h-4 w-4 mr-2" />
                              {order.clientTelephone}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="h-4 w-4 mr-2" />
                              {order.adresseLivraison}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Détails commande</h4>
                          <div className="space-y-2">
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Produit:</span> {order.produit}
                            </div>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Quantité:</span> {order.quantite}
                            </div>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Prix:</span> {order.prix} €
                            </div>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Boutique:</span> {order.boutique}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="ml-6 flex flex-col space-y-2">
                      {order.status === 'en_cours' && (
                        <>
                          <button
                            onClick={() => updateOrderStatus(order._id, 'livré')}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marquer livré
                          </button>
                          <button
                            onClick={() => updateOrderStatus(order._id, 'non_livré')}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Non livré
                          </button>
                        </>
                      )}
                      
                      {order.status === 'en_attente' && (
                        <button
                          onClick={() => updateOrderStatus(order._id, 'en_cours')}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Commencer livraison
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LivreurDashboard;
