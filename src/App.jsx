import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Landing from "@/pages/Landing";
import Privacidad from "@/pages/Privacidad";
import Terminos from "@/pages/Terminos";
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppLayout from '@/components/layout/AppLayout';
import Home from '@/pages/Home';
import Clients from '@/pages/Clients';
import Products from '@/pages/Products';
import Orders from '@/pages/Orders';
import NewOrder from '@/pages/NewOrder';
import Payments from '@/pages/Payments';
import Deliveries from '@/pages/Deliveries';
import QuickMessages from '@/pages/QuickMessages';
import Report from '@/pages/Report';
import Catalog from '@/pages/Catalog';
import ProductPublic from '@/pages/ProductPublic';
import Promote from '@/pages/Promote';
import OrderDetail from '@/pages/OrderDetail';

const AuthenticatedApp = () => {
  const { isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/inicio" element={<Home />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/productos" element={<Products />} />
          <Route path="/pedidos" element={<Orders />} />
          <Route path="/pedidos/nuevo" element={<NewOrder />} />
          <Route path="/pedido/:id" element={<OrderDetail />} />
          <Route path="/cobros" element={<Payments />} />
          <Route path="/entregas" element={<Deliveries />} />
          <Route path="/mensajes" element={<QuickMessages />} />
          <Route path="/reporte" element={<Report />} />
          <Route path="/promocionar" element={<Promote />} />
        </Route>
      </Route>
      <Route path="/privacidad" element={<Privacidad />} />
      <Route path="/terminos" element={<Terminos />} />
      <Route path="/catalogo" element={<Catalog />} />
      <Route path="/producto/:id" element={<ProductPublic />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App