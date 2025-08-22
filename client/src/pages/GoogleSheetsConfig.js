import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Settings, 
  RefreshCw,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import api from '../api/axios';

const GoogleSheetsConfig = () => {
  const { user } = useAuth();
  const [configs, setConfigs] = useState([]);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    spreadsheetId: '',
    sheetName: 'Feuille 1',
    description: ''
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const [configsRes, currentRes] = await Promise.all([
        api.get('/google-sheets/config'),
        api.get('/google-sheets/config/current')
      ]);
      
      if (configsRes.data.success) {
        setConfigs(configsRes.data.configs);
      }
      
      if (currentRes.data.success) {
        setCurrentConfig(currentRes.data.config);
      }
    } catch (error) {
      console.error('Erreur récupération configurations:', error);
      toast.error('Erreur lors du chargement des configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      spreadsheetId: '',
      sheetName: 'Feuille 1',
      description: ''
    });
    setEditingConfig(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.spreadsheetId) {
      toast.error('Le nom et l\'ID du spreadsheet sont requis');
      return;
    }

    try {
      setLoading(true);
      
      if (editingConfig) {
        // Mise à jour
        await api.put(`/google-sheets/config/${editingConfig._id}`, formData);
        toast.success('Configuration mise à jour avec succès');
      } else {
        // Création
        await api.post('/google-sheets/config', formData);
        toast.success('Configuration créée avec succès');
      }
      
      resetForm();
      fetchConfigs();
    } catch (error) {
      console.error('Erreur sauvegarde configuration:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      spreadsheetId: config.spreadsheetId,
      sheetName: config.sheetName,
      description: config.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (configId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette configuration ?')) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/google-sheets/config/${configId}`);
      toast.success('Configuration supprimée avec succès');
      fetchConfigs();
    } catch (error) {
      console.error('Erreur suppression configuration:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (configId) => {
    try {
      setLoading(true);
      await api.post(`/google-sheets/config/${configId}/activate`);
      toast.success('Configuration activée avec succès');
      fetchConfigs();
    } catch (error) {
      console.error('Erreur activation configuration:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de l\'activation');
    } finally {
      setLoading(false);
    }
  };

  const handleTestAccess = async (spreadsheetId, sheetName) => {
    try {
      setLoading(true);
      const response = await api.post('/google-sheets/config/test', {
        spreadsheetId,
        sheetName
      });
      
      if (response.data.success) {
        const { testResult } = response.data;
        toast.success(
          `Accès réussi à "${testResult.spreadsheetTitle}" - ${testResult.availableSheets.length} feuilles disponibles`,
          { duration: 5000 }
        );
      }
    } catch (error) {
      console.error('Erreur test accès:', error);
      toast.error(error.response?.data?.error || 'Erreur lors du test d\'accès');
    } finally {
      setLoading(false);
    }
  };

  const getSpreadsheetUrl = (spreadsheetId) => {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Configuration Google Sheets
              </h1>
              <p className="text-gray-600">
                Gérez vos connexions Google Sheets et changez de feuille selon vos besoins
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nouvelle configuration
            </button>
          </div>
        </div>

        {/* Configuration actuelle */}
        {currentConfig && (
          <div className="bg-white rounded-lg shadow mb-8 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                Configuration active
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Nom</p>
                <p className="text-sm text-gray-900">{currentConfig.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Spreadsheet ID</p>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-gray-900 font-mono">{currentConfig.spreadsheetId}</p>
                  <a
                    href={getSpreadsheetUrl(currentConfig.spreadsheetId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Feuille</p>
                <p className="text-sm text-gray-900">{currentConfig.sheetName}</p>
              </div>
            </div>
            {currentConfig.description && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="text-sm text-gray-900">{currentConfig.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Formulaire */}
        {showForm && (
          <div className="bg-white rounded-lg shadow mb-8 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                {editingConfig ? 'Modifier la configuration' : 'Nouvelle configuration'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nom de la configuration *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ex: Boutique principale"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="spreadsheetId" className="block text-sm font-medium text-gray-700">
                    ID du Spreadsheet *
                  </label>
                  <input
                    type="text"
                    id="spreadsheetId"
                    name="spreadsheetId"
                    value={formData.spreadsheetId}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sheetName" className="block text-sm font-medium text-gray-700">
                    Nom de la feuille
                  </label>
                  <input
                    type="text"
                    id="sheetName"
                    name="sheetName"
                    value={formData.sheetName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ex: Feuille 1"
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <input
                    type="text"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ex: Commandes de la boutique principale"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => handleTestAccess(formData.spreadsheetId, formData.sheetName)}
                  disabled={!formData.spreadsheetId || loading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tester l'accès
                </button>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Settings className="h-4 w-4 mr-2" />
                    )}
                    {editingConfig ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Liste des configurations */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Toutes les configurations ({configs.length})
            </h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="mx-auto h-8 w-8 text-blue-500 animate-spin" />
              <p className="mt-2 text-gray-600">Chargement...</p>
            </div>
          ) : configs.length === 0 ? (
            <div className="p-8 text-center">
              <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune configuration
              </h3>
              <p className="text-gray-500">
                Créez votre première configuration Google Sheets pour commencer.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {configs.map((config) => (
                <div key={config._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {config.name}
                        </h3>
                        {config.isActive && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-500">Spreadsheet ID:</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {config.spreadsheetId}
                            </code>
                            <a
                              href={getSpreadsheetUrl(config.spreadsheetId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-500">Feuille:</span>
                          <p className="mt-1">{config.sheetName}</p>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-500">Créée le:</span>
                          <p className="mt-1">
                            {new Date(config.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      
                      {config.description && (
                        <p className="text-sm text-gray-600 mt-2">
                          {config.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-6">
                      {!config.isActive && (
                        <button
                          onClick={() => handleActivate(config._id)}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Activer
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleEdit(config)}
                        disabled={loading}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Modifier
                      </button>
                      
                      {!config.isActive && (
                        <button
                          onClick={() => handleDelete(config._id)}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Supprimer
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

export default GoogleSheetsConfig;
