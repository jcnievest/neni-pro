import { Toaster } from "@/components/ui/toaster"
import { lazy, Suspense } from 'react';
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Landing from "@/pages/Landing";
import Privacidad from "@/pages/Privacidad";
import Terminos from "@/pages/Terminos";
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ConfirmRegistration from '@/pages/ConfirmRegistration';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
const AppLayout = lazy(() => import('@/components/layout/AppLayout'));
const Home = lazy(() => import('@/pages/Home'));
const Clients = lazy(() => import('@/pages/Clients'));
const Products = lazy(() => import('@/pages/Products'));
const Orders = lazy(() => import('@/pages/Orders'));
const NewOrder = lazy(() => import('@/pages/NewOrder'));
const Payments = lazy(() => import('@/pages/Payments'));
const Deliveries = lazy(() => import('@/pages/Deliveries'));
const QuickMessages = lazy(() => import('@/pages/QuickMessages'));
const Report = lazy(() => import('@/pages/Report'));
const Catalog = lazy(() => import('@/pages/Catalog'));
const ProductPublic = lazy(() => import('@/pages/ProductPublic'));
const Promote = lazy(() => import('@/pages/Promote'));
const OrderDetail = lazy(() => import('@/pages/OrderDetail'));

const AuthenticatedApp = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/confirm" element={<ConfirmRegistration />} />
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
          <Suspense fallback={<p role="status" className="p-8 text-center text-muted-foreground">Cargando Nenis Pro…</p>}>
            <AuthenticatedApp />
          </Suspense>
        </Router>
        <Toaster />
        <SonnerToaster richColors position="top-center" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
