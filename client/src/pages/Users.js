import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import {
  Users as UsersIcon,
  UserPlus,
  Edit,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Shield
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'closeur',
    boutique: '',
    nom: '',
    prenom: '',
    telephone: '',
    actif: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data.users || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type, user = null) => {
    setModalType(type);
    setSelectedUser(user);
    
    if (type === 'edit' && user) {
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        role: user.role,
        boutique: user.boutique || '',
        nom: user.nom || '',
        prenom: user.prenom || '',
        telephone: user.telephone || '',
        actif: user.actif
      });
    } else {
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'closeur',
        boutique: '',
        nom: '',
        prenom: '',
        telephone: '',
        actif: true
      });
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  const handleFormChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = modalType === 'edit' 
        ? `http://localhost:5000/api/users/${selectedUser._id}`
        : 'http://localhost:5000/api/users';
      
      const method = modalType === 'edit' ? 'put' : 'post';
      
      const body = { ...formData };
      if (modalType === 'edit' && !body.password) {
        delete body.password;
      }

      // Debug: afficher les données envoyées
      console.log('Données envoyées à l\'API:', body);
      console.log('URL de l\'API:', url);

      await axios[method](url, body);

      toast.success(
        modalType === 'edit' 
          ? 'Utilisateur modifié avec succès'
          : 'Utilisateur créé avec succès'
      );
      closeModal();
      fetchUsers();
    } catch (error) {
      if (error.response?.data?.details) {
        // Afficher les détails de validation
        const validationErrors = error.response.data.details.map(err => err.msg).join(', ');
        toast.error(`Erreurs de validation: ${validationErrors}`);
      } else {
        toast.error(error.response?.data?.message || 'Erreur lors de l\'opération');
      }
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const endpoint = currentStatus 
        ? `/api/users/${userId}`
        : `/api/users/${userId}/reactivate`;
      
      const method = currentStatus ? 'delete' : 'post';

      await axios[method](endpoint);

      toast.success(
        currentStatus 
          ? 'Utilisateur désactivé avec succès'
          : 'Utilisateur réactivé avec succès'
      );
      fetchUsers();
    } catch (error) {
      if (error.response?.data?.details) {
        // Afficher les détails de validation
        const validationErrors = error.response.data.details.map(err => err.msg).join(', ');
        toast.error(`Erreurs de validation: ${validationErrors}`);
      } else {
        toast.error(error.response?.data?.message || 'Erreur lors de l\'opération');
      }
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      'admin': { color: 'bg-red-100 text-red-800', label: 'Administrateur' },
      'closeur': { color: 'bg-blue-100 text-blue-800', label: 'Closeur' },
      'livreur': { color: 'bg-green-100 text-green-800', label: 'Livreur' }
    };

    const config = roleConfig[role] || roleConfig['closeur'];

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Shield className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (actif) => {
    return actif ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <UserCheck className="w-3 h-3 mr-1" />
        Actif
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <UserX className="w-3 h-3 mr-1" />
        Inactif
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
        {currentUser.role === 'admin' && (
          <button
            onClick={() => openModal('create')}
            className="btn btn-primary"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Nouvel Utilisateur
          </button>
        )}
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Boutique
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(users) && users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.nom} {user.prenom}
                      </div>
                      <div className="text-sm text-gray-500">
                        @{user.username}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900 flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        {user.email}
                      </div>
                      {user.telephone && (
                        <div className="text-sm text-gray-500 flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {user.telephone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.boutique || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user.actif)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {user._id !== currentUser._id && currentUser.role === 'admin' && (
                        <>
                          <button
                            onClick={() => openModal('edit', user)}
                            className="btn btn-sm btn-secondary"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Modifier
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user._id, user.actif)}
                            className={`btn btn-sm ${user.actif ? 'btn-danger' : 'btn-success'}`}
                          >
                            {user.actif ? (
                              <>
                                <UserX className="w-4 h-4 mr-1" />
                                Désactiver
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4 mr-1" />
                                Réactiver
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!Array.isArray(users) || users.length === 0) && (
          <div className="text-center py-8">
            <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucun utilisateur trouvé</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {modalType === 'create' ? 'Nouvel Utilisateur' : 'Modifier l\'Utilisateur'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => handleFormChange('nom', e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={formData.prenom}
                    onChange={(e) => handleFormChange('prenom', e.target.value)}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom d'utilisateur *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleFormChange('username', e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {modalType === 'edit' ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe *'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleFormChange('password', e.target.value)}
                  className="input"
                  required={modalType === 'create'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => handleFormChange('telephone', e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rôle *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleFormChange('role', e.target.value)}
                  className="input"
                  required
                >
                  <option value="closeur">Closeur</option>
                  <option value="livreur">Livreur</option>
                  {currentUser.role === 'admin' && (
                    <option value="admin">Administrateur</option>
                  )}
                </select>
              </div>

              {formData.role === 'closeur' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Boutique
                  </label>
                  <select
                    value={formData.boutique}
                    onChange={(e) => handleFormChange('boutique', e.target.value)}
                    className="input"
                  >
                    <option value="">Sélectionner une boutique</option>
                    <option value="boutique1">Boutique 1</option>
                    <option value="boutique2">Boutique 2</option>
                  </select>
                </div>
              )}

              {modalType === 'edit' && (
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.actif}
                      onChange={(e) => handleFormChange('actif', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Utilisateur actif</span>
                  </label>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {modalType === 'create' ? 'Créer' : 'Modifier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
