import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LivreurDashboard from './pages/LivreurDashboard';
import Orders from './pages/Orders';
import Orderlivreur from "./pages/OrdersLivreur";
import Users from './pages/Users';
import Settings from './pages/Settings';
import GoogleSheetsTest from './pages/GoogleSheetsTest';
import GoogleSheetsConfig from './pages/GoogleSheetsConfig';
import AdminActivity from './pages/AdminActivity';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Composant pour protéger les routes
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Rediriger vers le dashboard approprié selon le rôle
    if (user.role === 'livreur') {
      return <Navigate to="/livreur-dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Composant pour la redirection basée sur le rôle
const RoleBasedRedirect = () => {
  const { user } = useAuth();
  
  if (user?.role === 'livreur') {
    return <Navigate to="/livreur-dashboard" replace />;
  }
  
  return <Navigate to="/dashboard" replace />;
};

// Composant principal de l'application
const AppContent = () => {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      
      {/* Routes protégées avec layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleBasedRedirect />} />
        <Route 
          path="dashboard" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="livreur-dashboard" 
          element={
            <ProtectedRoute requiredRole="livreur">
              <LivreurDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="orders" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Orders />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="orderlivreur" 
          element={
            <ProtectedRoute requiredRole="livreur">
              <Orderlivreur />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="users" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Users />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="google-sheets" 
          element={
            <ProtectedRoute requiredRole="admin">
              <GoogleSheetsTest />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="google-sheets-config" 
          element={
            <ProtectedRoute requiredRole="admin">
              <GoogleSheetsConfig />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="admin-activity" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminActivity />
            </ProtectedRoute>
          } 
        />
      </Route>
      
      {/* Route de fallback pour les URLs non trouvées */}
      <Route path="*" element={<Navigate to="/" replace />} />
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