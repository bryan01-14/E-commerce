import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Truck, CheckCircle, RefreshCw, XCircle, Loader2 } from 'lucide-react';
import api from '../api/axios';

const Orders = () => {
  const [sheetData, setSheetData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [livreurs, setLivreurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectedLivreur, setSelectedLivreur] = useState('');

  const fetchSheetData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [sheetsRes, livreursRes] = await Promise.all([
        api.get('/google-sheets/data'),
        api.get('/users?role=livreur&actif=true')
      ]);
      
      if (sheetsRes.data.success) {
        // Filtrer seulement les commandes en attente
        const pendingOrders = sheetsRes.data.data.filter(
          order => order.Statut === 'En attente'
        );
        setSheetData(pendingOrders);
        setHeaders(sheetsRes.data.headers);
      } else {
        throw new Error(sheetsRes.data.error || 'Failed to load sheet data');
      }
      
      setLivreurs(livreursRes.data?.users || []);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.error || err.message);
      toast.error(`Erreur: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const assignOrders = async () => {
    if (!selectedLivreur || selectedOrders.length === 0) {
      toast.error('Sélectionnez un livreur et des commandes');
      return;
    }
  
    try {
      setLoading(true);
  
      // Préparer les données à envoyer
      const ordersToAssign = selectedOrders.map(index => {
        const row = sheetData[index];
        return {
          googleSheetsId: row.ID,
          numeroCommande: row['N° Commande'],
          dateCommande: new Date(row.Date),
          clientNom: row.Client,
          clientTelephone: row.Téléphone,
          adresseLivraison: row.Adresse,
          produits: [{
            nom: row.Produit,
            quantite: row.Qte,
            prix: row.Prix
          }],
          boutique: row.Boutique,
          status: 'attribué'
        };
      });

      // Envoyer au backend
      const response = await api.post('/orders/assign-from-sheets', {
        livreurId: selectedLivreur,
        sheetOrders: ordersToAssign
      });

      // Mettre à jour l'interface
      if (response.data.success) {
        // Supprimer les commandes attribuées de l'affichage
        setSheetData(prev => 
          prev.filter((_, index) => !selectedOrders.includes(index.toString()))
        );
        setSelectedOrders([]);
        toast.success(`${ordersToAssign.length} commande(s) attribuée(s) avec succès`);
      } else {
        throw new Error(response.data.error || 'Erreur lors de l\'attribution');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheetData();
  }, []);

  // Fonctions d'interface restantes...
  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOrders(sheetData.map((_, index) => index.toString()));
    } else {
      setSelectedOrders([]);
    }
  };

  const toggleSelectOrder = (index) => {
    const indexStr = index.toString();
    setSelectedOrders(prev =>
      prev.includes(indexStr)
        ? prev.filter(id => id !== indexStr)
        : [...prev, indexStr]
    );
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center">
            <Truck className="mr-2" />
            Attribution des commandes
          </h2>
          <button
            onClick={fetchSheetData}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-400"
          >
            {loading ? (
              <Loader2 className="mr-2 animate-spin" />
            ) : (
              <RefreshCw className="mr-2" />
            )}
            Rafraîchir
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <div className="flex items-center">
              <XCircle className="mr-2" />
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2">
            <label className="block mb-2 font-medium">Livreur</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedLivreur}
              onChange={(e) => setSelectedLivreur(e.target.value)}
              disabled={loading || livreurs.length === 0}
            >
              <option value="">Choisir un livreur</option>
              {livreurs.map(livreur => (
                <option key={livreur._id} value={livreur._id}>
                  {livreur.nom} {livreur.prenom}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={assignOrders}
              disabled={!selectedLivreur || selectedOrders.length === 0 || loading}
              className={`flex items-center px-4 py-2 rounded-md w-full justify-center ${
                (!selectedLivreur || selectedOrders.length === 0) 
                  ? 'bg-gray-400' 
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              <CheckCircle className="mr-2" />
              Attribuer ({selectedOrders.length})
            </button>
          </div>
        </div>

        {loading && sheetData.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
          </div>
        ) : sheetData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucune commande à attribuer
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === sheetData.length && sheetData.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4"
                    />
                  </th>
                  {headers.map((header, index) => (
                    <th key={index} className="px-6 py-3 text-left">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sheetData.map((row, rowIndex) => {
                  const rowKey = rowIndex.toString();
                  return (
                    <tr 
                      key={rowIndex}
                      className={`hover:bg-gray-50 ${
                        selectedOrders.includes(rowKey) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(rowKey)}
                          onChange={() => toggleSelectOrder(rowIndex)}
                          className="h-4 w-4"
                        />
                      </td>
                      {headers.map((header, cellIndex) => (
                        <td
                          key={`${rowIndex}-${cellIndex}`}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {row[header] || 'N/A'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;