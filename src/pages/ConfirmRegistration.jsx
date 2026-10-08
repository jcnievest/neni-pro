import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/lib/AuthContext';
import { campaignAnalytics } from '@/lib/analytics';

export default function ConfirmRegistration() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);
  const [callbackFailed] = useState(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    return query.has('error') || query.has('error_code') || hash.has('error') || hash.has('error_code');
  });

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (callbackFailed || !user?.email_confirmed_at) return;
    let active = true;
    // Measurement is best effort; it cannot hold up a confirmed account.
    const timer = setTimeout(() => active && navigate('/pedidos', { replace: true }), 1500);
    campaignAnalytics.milestone('CompleteRegistration', user).finally(() => {
      clearTimeout(timer);
      if (active) navigate('/pedidos', { replace: true });
    });
    return () => { active = false; clearTimeout(timer); };
  }, [user, navigate, callbackFailed]);

  const waiting = !callbackFailed && !timedOut && (isLoadingAuth || user?.email_confirmed_at);
  return (
    <AuthLayout icon={Mail} title={waiting ? 'Confirmando tu cuenta' : 'Revisa tu enlace'}
      subtitle={waiting ? 'Un momento, estamos preparando tu acceso.' : 'El enlace puede haber vencido o ya haberse utilizado.'}>
      <p role="status" className="text-sm text-center">
        {waiting ? 'Tu cuenta se abrirá en unos segundos.' : 'Si ya confirmaste tu correo, puedes iniciar sesión.'}
      </p>
      <Link to="/login" className="mt-6 block text-center text-primary underline">Ir a iniciar sesión</Link>
    </AuthLayout>
  );
}
