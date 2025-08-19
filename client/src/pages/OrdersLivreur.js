import React, { useState, useEffect } from "react";
import { useAuth } from '../contexts/AuthContext';
import api from "../api/axios";
import { Truck, CheckCircle, XCircle, Clock, MapPin, Package , User  } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import toast from "react-hot-toast";

const Orderlivreur = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await api.get("/orders/assigned");
        setOrders(response.data.orders || []);
      } catch (error) {
        console.error("Erreur lors de la récupération des commandes:", error);
        toast.error("Erreur lors du chargement des commandes");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, {
        status: newStatus,
        livreurId: user._id
      });
      
      // Mettre à jour localement l'état de la commande
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === orderId ? { ...order, status: newStatus } : order
        )
      );
      
      toast.success(`Commande marquée comme ${newStatus === "livré" ? "livrée" : "non livrée"}`);
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "attribué":
        return "bg-blue-100 text-blue-800";
      case "livré":
        return "bg-green-100 text-green-800";
      case "annulé":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "attribué":
        return "À livrer";
      case "livré":
        return "Livrée";
      case "annulé":
        return "Annulée";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Mes commandes à livrer</h1>
      
      {orders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600">Aucune commande à livrer pour le moment</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {orders.map((order) => (
            <div key={order._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    Commande #{order.numeroCommande}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {format(new Date(order.dateCommande), "PPPp", { locale: fr })}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Client
                  </h3>
                  <p>{order.clientNom}</p>
                  <p className="text-gray-600">{order.clientTelephone}</p>
                </div>

                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Adresse de livraison
                  </h3>
                  <p>{order.adresseLivraison}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-medium mb-2 flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Produits
                </h3>
                <ul className="divide-y divide-gray-200">
                  {order.produits.map((produit, index) => (
                    <li key={index} className="py-2 flex justify-between">
                      <span>{produit.nom}</span>
                      <span className="text-gray-600">
                        {produit.quantite} × {produit.prix} Fr
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {order.status === "attribué" && (
                <div className="flex space-x-4">
                  <button
                    onClick={() => updateOrderStatus(order._id, "livré")}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Marquer comme livré
                  </button>
                  <button
                    onClick={() => updateOrderStatus(order._id, "annulé")}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    <XCircle className="h-5 w-5 mr-2" />
                    Marquer comme annulé
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orderlivreur;