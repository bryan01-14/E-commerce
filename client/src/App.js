import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LivreurDashboard from './pages/LivreurDashboard';
import Orders from './pages/Orders';
import Orderlivreur from "./pages/OrdersLivreur"
import Users from './pages/Users';
import Settings from './pages/Settings';
import GoogleSheetsTest from './pages/GoogleSheetsTest';
import GoogleSheetsConfig from './pages/GoogleSheetsConfig';
import AdminActivity from './pages/AdminActivity';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Composant pour protéger les routes
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Composant principal de l'application
const AppContent = () => {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* <Route index element={<Navigate to="/dashboard" replace />} /> */}
        <Route path="livreur-dashboard" element={<LivreurDashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orderlivreur" element={<Orderlivreur />} />
        <Route path="users" element={<Users />} />
        <Route path="settings" element={<Settings />} />
        <Route path="google-sheets" element={<GoogleSheetsTest />} />
        <Route path="google-sheets-config" element={<GoogleSheetsConfig />} />
        <Route path="admin-activity" element={<AdminActivity />} />
      </Route>
    </Routes>
  );
};

// Composant App principal
const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
