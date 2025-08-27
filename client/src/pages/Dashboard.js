import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  SwissFranc
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/axios';
import { fr } from 'date-fns/locale';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSheetConfig, setActiveSheetConfig] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Préparer les paramètres en fonction du rôle
        const params = {};
        
        // Si l'utilisateur est un closeur, filtrer par sa boutique
        if (user?.role === 'closeur' && user?.boutique) {
          params.boutique = user.boutique;
        }
        
        const [statsResponse, ordersResponse] = await Promise.all([
          api.get('/orders/stats/overview', { params }),
          api.get('/orders', {
            params: { 
              ...params,
              limit: 5, 
              sortBy: 'dateCommande', 
              sortOrder: 'desc' 
            }
          })
        ]);
        
        setStats(statsResponse.data);
        setRecentOrders(ordersResponse.data.orders || []);
        
        // Récupérer les informations de la configuration active
        if (statsResponse.data.activeSheetConfig) {
          setActiveSheetConfig(statsResponse.data.activeSheetConfig);
        }
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
  
    if (user) {
      fetchData();
    }
  }, [user]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Livré':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'Non Livré':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'Attribué':
        return <Truck className="h-5 w-5 text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Livré':
        return 'bg-green-100 text-green-800';
      case 'Non Livré':
        return 'bg-red-100 text-red-800';
      case 'Attribué':
        return 'bg-blue-100 text-blue-800';
      case 'Reprogrammé':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Tableau de bord
        </h1>
        {user ? (
          <p className="mt-1 text-sm text-gray-500">
            Bienvenue, {user.prenom} {user.nom}
            {user.role === 'closeur' && user.boutique && ` - Boutique: ${user.boutique}`}
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-500">
            Bienvenue
          </p>
        )}
        
        {/* Configuration active */}
        {activeSheetConfig ? (
          <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Configuration active : {activeSheetConfig.name}
                </p>
                <p className="text-xs text-green-600">
                  Feuille : {activeSheetConfig.sheetName} | 
                  Spreadsheet ID : {activeSheetConfig.spreadsheetId.substring(0, 20)}...
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800">
                  Aucune configuration Google Sheets active
                </p>
                <p className="text-xs text-yellow-600">
                  Les données affichées proviennent de toutes les configurations
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Commandes
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats?.total || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Livrées
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats?.statsByStatus?.find(s => s._id === 'Livré')?.count || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  En attente
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats?.statsByStatus?.find(s => s._id === 'En attente')?.count || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <SwissFranc className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Chiffre d'affaires
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats?.totalValue?.toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: 'XOF'
                  }) || '0 FCFA'}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-4 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Commandes récentes
          </h3>
        </div>
        <div className="p-4">
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Aucune commande récente
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commande
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produit
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(recentOrders) && recentOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.numeroCommande}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{order.nomClient}</div>
                          <div className="text-gray-500 text-xs">{order.telephone}</div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{order.produit}</div>
                          <div className="text-gray-500 text-xs">Qté: {order.quantite}</div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(order.statut)}
                          <span className={`ml-2 text-xs px-2 py-1 rounded-full ${getStatusBadge(order.statut)}`}>
                            {order.statut}
                          </span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(order.dateCommande), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.prix.toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'XOF'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Actions rapides
          </h3>
          <div className="space-y-3">
            <button 
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              onClick={() => navigate('/orders')}
            >
              Voir toutes les commandes
            </button>
            {user?.role === 'admin' && (
              <button 
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                onClick={() => navigate('/users')}
              >
                Gérer les utilisateurs
              </button>
            )}
            <button 
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              onClick={() => navigate('/settings')}
            >
              Paramètres
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Statistiques par statut
          </h3>
          <div className="space-y-3">
            {stats?.statsByStatus?.map((stat) => (
              <div key={stat._id} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{stat._id}</span>
                <span className="text-sm font-medium text-gray-900">
                  {stat.count} ({((stat.count / stats.total) * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Informations système
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Rôle:</span>
              <span className="font-medium">{user?.role || 'N/A'}</span>
            </div>
            {user?.boutique && (
              <div className="flex justify-between">
                <span className="text-gray-600">Boutique:</span>
                <span className="font-medium">{user.boutique}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Dernière connexion:</span>
              <span className="font-medium">
                {user?.derniereConnexion ? 
                  format(new Date(user.derniereConnexion), 'dd/MM/yyyy HH:mm', { locale: fr }) :
                  'N/A'
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;