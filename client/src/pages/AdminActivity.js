import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import {
  Users,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Activity,
  Filter,
  RefreshCw,
  Eye,
  UserCheck,
  UserX,
  Award,
  AlertCircle,
  XCircle as XCircleIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../api/axios';

const AdminActivity = () => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    userType: 'all',
    dateRange: '7days',
    status: 'all'
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [activitiesRes, usersRes, statsRes] = await Promise.all([
        api.get('/admin/activities', { params: filters }),
        api.get('/admin/users', { params: { userType: filters.userType, dateRange: filters.dateRange } }),
        api.get('/admin/stats', { params: { dateRange: filters.dateRange } })
      ]);

      setActivities(activitiesRes.data.activities || []);
      setUsers(usersRes.data.users || []);
      setStats(statsRes.data.stats || {});
    } catch (error) {
      console.error('Erreur récupération données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'livré':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'en_attente':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'attribué':
        return <Truck className="h-4 w-4 text-blue-500" />;
      case 'annulé':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'livré':
        return 'bg-green-100 text-green-800';
      case 'en_attente':
        return 'bg-yellow-100 text-yellow-800';
      case 'attribué':
        return 'bg-blue-100 text-blue-800';
      case 'annulé':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'closeur':
        return 'bg-blue-100 text-blue-800';
      case 'livreur':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Accès refusé
          </h2>
          <p className="text-gray-600">
            Vous devez être administrateur pour accéder à cette page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Surveillance des Activités
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Surveillez les activités des livreurs et closeurs, leurs commandes et performances
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={fetchData}
                disabled={loading}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type d'utilisateur
              </label>
              <select
                value={filters.userType}
                onChange={(e) => handleFilterChange('userType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous les utilisateurs</option>
                <option value="livreur">Livreurs uniquement</option>
                <option value="closeur">Closeurs uniquement</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Période
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7days">7 derniers jours</option>
                <option value="30days">30 derniers jours</option>
                <option value="90days">90 derniers jours</option>
                <option value="all">Toute la période</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="livré">Livré</option>
                <option value="en_attente">En attente</option>
                <option value="attribué">Attribué</option>
                <option value="annulé">Annulé</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total utilisateurs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Truck className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Livreurs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.livreurs || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Closeurs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.closeurs || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Livraisons/Attributions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.livraisons || 0} / {stats.attributions || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des utilisateurs avec activités */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Utilisateurs et leurs activités ({users.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="mx-auto h-8 w-8 text-blue-500 animate-spin" />
              <p className="mt-2 text-gray-600">Chargement...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun utilisateur trouvé
              </h3>
              <p className="text-gray-500">
                Aucun utilisateur ne correspond aux critères de recherche.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {users.map((user) => (
                <div key={user._id} className="p-4 sm:p-6 hover:bg-gray-50">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {user.prenom} {user.nom}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                        {user.actif ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <UserX className="h-3 w-3 mr-1" />
                            Inactif
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-500">Email:</span>
                          <p className="mt-1 flex items-center">
                            <Mail className="h-4 w-4 mr-1 text-gray-400" />
                            {user.email}
                          </p>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-500">Téléphone:</span>
                          <p className="mt-1 flex items-center">
                            <Phone className="h-4 w-4 mr-1 text-gray-400" />
                            {user.telephone}
                          </p>
                        </div>

                        {user.boutique && (
                          <div>
                            <span className="font-medium text-gray-500">Boutique:</span>
                            <p className="mt-1 flex items-center">
                              <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                              {user.boutique}
                            </p>
                          </div>
                        )}

                        <div>
                          <span className="font-medium text-gray-500">Dernière connexion:</span>
                          <p className="mt-1 flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            {user.derniereConnexion ? 
                              format(new Date(user.derniereConnexion), 'dd/MM/yyyy HH:mm', { locale: fr }) :
                              'Jamais'
                            }
                          </p>
                        </div>
                      </div>

                      {/* Statistiques de l'utilisateur */}
                      {user.stats && (
                        <div className="mt-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg max-w-xs">
                            <p className="text-2xl font-bold text-blue-600">{user.stats.count || 0}</p>
                            <p className="text-xs text-gray-500">
                              {user.stats.type === 'livraisons' ? 'Colis livrés' : 'Colis attribués'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 lg:flex-col lg:gap-2">
                      <button
                        onClick={() => handleUserSelect(user)}
                        className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Voir détails
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activités récentes */}
        <div className="bg-white rounded-lg shadow mt-6">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Activités récentes ({activities.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="mx-auto h-8 w-8 text-blue-500 animate-spin" />
              <p className="mt-2 text-gray-600">Chargement...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune activité récente
              </h3>
              <p className="text-gray-500">
                Aucune activité ne correspond aux critères de recherche.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commande
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activities.map((activity) => (
                    <tr key={activity._id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {activity.user?.prenom} {activity.user?.nom}
                            </div>
                            <div className="text-sm text-gray-500">
                              {activity.user?.role}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {activity.action}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {activity.order?.numeroCommande || 'N/A'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(activity.order?.status)}
                          <span className={`ml-2 text-xs px-2 py-1 rounded-full ${getStatusBadge(activity.order?.status)}`}>
                            {activity.order?.status || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(activity.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal détails utilisateur */}
        {showUserDetails && selectedUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Détails de {selectedUser.prenom} {selectedUser.nom}
                  </h3>
                  <button
                    onClick={() => setShowUserDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.telephone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Rôle</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.role}</p>
                    </div>
                    {selectedUser.boutique && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Boutique</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedUser.boutique}</p>
                      </div>
                    )}
                  </div>

                  {selectedUser.stats && (
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Statistiques</h4>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-3xl font-bold text-blue-600">{selectedUser.stats.count || 0}</p>
                        <p className="text-sm text-gray-500">
                          {selectedUser.stats.type === 'livraisons' ? 'Colis livrés' : 'Colis attribués'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setShowUserDetails(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminActivity;