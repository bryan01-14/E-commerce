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
  AlertCircle,
  Database,
  FileText,
  Info
} from 'lucide-react';
import api from '../api/axios';

const GoogleSheetsConfig = () => {
  const { user } = useAuth();
  const [configs, setConfigs] = useState([]);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    spreadsheetId: '',
    sheetName: '',
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
        console.log('Configuration active mise à jour:', currentRes.data.config?.name);
      } else {
        setCurrentConfig(null);
        console.log('Aucune configuration active trouvée');
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
      sheetName: '',
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
      setSyncStatus('Synchronisation en cours...');
      
      const response = await api.post(`/google-sheets/config/${configId}/activate`);
      
      if (response.data.success) {
        toast.success('Configuration activée avec succès');
        
        // Afficher le résultat de la synchronisation
        if (response.data.syncResult) {
          const { created, updated, total } = response.data.syncResult;
          toast.success(
            `Synchronisation terminée: ${created} nouvelles commandes, ${updated} mises à jour (Total: ${total})`,
            { duration: 6000 }
          );
        }
        
        // Mettre à jour immédiatement la configuration active
        if (response.data.config) {
          setCurrentConfig(response.data.config);
        }
        
        // Mettre à jour la liste des configurations
        await fetchConfigs();
        
        // Forcer une mise à jour de la configuration active après un délai
        setTimeout(async () => {
          try {
            const currentRes = await api.get('/google-sheets/config/current');
            if (currentRes.data.success) {
              setCurrentConfig(currentRes.data.config);
            }
          } catch (error) {
            console.error('Erreur mise à jour configuration active:', error);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Erreur activation configuration:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de l\'activation');
    } finally {
      setLoading(false);
      setSyncStatus(null);
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

  const handleManualSync = async () => {
    try {
      setLoading(true);
      setSyncStatus('Synchronisation manuelle en cours...');
      
      const response = await api.post('/google-sheets/sync-orders');
      
      if (response.data.success) {
        const { syncResult } = response.data;
        toast.success(
          `Synchronisation manuelle terminée: ${syncResult.created} nouvelles commandes, ${syncResult.updated} mises à jour`,
          { duration: 6000 }
        );
      }
    } catch (error) {
      console.error('Erreur synchronisation manuelle:', error);
      
      // Afficher un message d'erreur plus informatif avec suggestions
      let errorMessage = 'Erreur lors de la synchronisation';
      let suggestions = [];
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        suggestions = error.response.data.suggestions || [];
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Afficher l'erreur principale
      toast.error(errorMessage, { duration: 8000 });
      
      // Afficher les suggestions d'aide si disponibles
      if (suggestions.length > 0) {
        setTimeout(() => {
          toast.error(
            `💡 Suggestions: ${suggestions[0]}`,
            { duration: 10000 }
          );
          
          // Afficher les autres suggestions
          suggestions.slice(1).forEach((suggestion, index) => {
            setTimeout(() => {
              toast.error(
                `💡 Suggestion ${index + 2}: ${suggestion}`,
                { duration: 8000 }
              );
            }, (index + 1) * 2000);
          });
        }, 1000);
      }
      
      // Afficher des suggestions d'aide selon le type d'erreur
      if (errorMessage.includes('Aucune configuration active')) {
        errorMessage += '. Créez d\'abord une configuration Google Sheets.';
      } else if (errorMessage.includes('Accès refusé')) {
        errorMessage += '. Vérifiez les permissions du compte de service.';
      } else if (errorMessage.includes('Configuration incomplète')) {
        errorMessage += '. Vérifiez que tous les champs sont remplis.';
      } else if (errorMessage.includes('format du nom de feuille')) {
        errorMessage += '. Vérifiez le nom de la feuille dans Google Sheets.';
      }
      
      // Afficher des suggestions d'aide
      if (error.response?.status === 500) {
        setTimeout(() => {
          toast.error(
            '🔧 Erreur serveur. Utilisez les scripts de diagnostic pour identifier le problème.',
            { duration: 8000 }
          );
        }, 3000);
      }
    } finally {
      setLoading(false);
      setSyncStatus(null);
    }
  };

  const getSpreadsheetUrl = (spreadsheetId) => {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  };

  if (!user || user.role !== 'admin') {
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
        {/* En-tête */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Configuration Google Sheets
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Gérez vos connexions Google Sheets et changez de feuille selon vos besoins
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleManualSync}
                disabled={loading}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Database className="h-4 w-4 mr-2" />
                Synchroniser
              </button>
              <button
                onClick={fetchConfigs}
                disabled={loading}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle configuration
              </button>
            </div>
          </div>
        </div>

        {/* Statut de synchronisation */}
        {syncStatus && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <RefreshCw className="h-5 w-5 text-blue-500 animate-spin mr-3" />
              <p className="text-sm text-blue-700">{syncStatus}</p>
            </div>
          </div>
        )}

        {/* Configuration actuelle */}
        {currentConfig ? (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg shadow mb-6 sm:mb-8 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                Configuration active
              </h2>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 self-start sm:self-auto border border-green-300">
                <CheckCircle className="h-4 w-4 mr-1" />
                Actuellement Active
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Nom</p>
                <p className="text-sm text-gray-900">{currentConfig.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Spreadsheet ID</p>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-xs sm:text-sm text-gray-900 font-mono break-all">{currentConfig.spreadsheetId}</p>
                  <a
                    href={getSpreadsheetUrl(currentConfig.spreadsheetId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex-shrink-0"
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
        ) : (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg shadow mb-6 sm:mb-8 p-4 sm:p-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-3" />
              <div>
                <h2 className="text-lg font-medium text-yellow-900">
                  Aucune configuration active
                </h2>
                <p className="text-sm text-yellow-700 mt-1">
                  Activez une configuration pour commencer à synchroniser vos données Google Sheets.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Formulaire */}
        {showForm && (
          <div className="bg-white rounded-lg shadow mb-6 sm:mb-8 p-4 sm:p-6">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => handleTestAccess(formData.spreadsheetId, formData.sheetName)}
                  disabled={!formData.spreadsheetId || loading}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tester l'accès
                </button>
                
                <div className="flex flex-col sm:flex-row gap-3">
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
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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

        {/* Info sur la synchronisation automatique */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-1">
                Synchronisation automatique
              </h3>
              <p className="text-sm text-blue-700">
                Lorsque vous changez de configuration active, les commandes de la nouvelle feuille sont automatiquement synchronisées avec votre base de données. 
                Vous pouvez également forcer une synchronisation manuelle avec le bouton "Synchroniser".
              </p>
            </div>
          </div>
        </div>

        {/* Liste des configurations */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
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
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
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
                <div key={config._id} className="p-4 sm:p-6 hover:bg-gray-50">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {config.name}
                        </h3>
                        {(config.isActive || (currentConfig && currentConfig._id === config._id)) && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 self-start sm:self-auto border border-green-300">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-500">Spreadsheet ID:</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">
                              {config.spreadsheetId}
                            </code>
                            <a
                              href={getSpreadsheetUrl(config.spreadsheetId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex-shrink-0"
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
                        <p className="text-sm text-gray-600 mt-3">
                          {config.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 lg:flex-col lg:gap-2">
                      {!(config.isActive || (currentConfig && currentConfig._id === config._id)) && (
                        <button
                          onClick={() => handleActivate(config._id)}
                          disabled={loading}
                          className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Activer
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleEdit(config)}
                        disabled={loading}
                        className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Modifier
                      </button>
                      
                      {!(config.isActive || (currentConfig && currentConfig._id === config._id)) && (
                        <button
                          onClick={() => handleDelete(config._id)}
                          disabled={loading}
                          className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
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
