import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getAccessState, getUserSubscription } from '@/lib/access';
import { syncMailerLiteSubscriber } from '@/lib/mailerlite';
import { campaignAnalytics } from '@/lib/analytics';

const AuthContext = createContext();

function isPasswordRecoveryUrl() {
  if (typeof window === 'undefined') return false;
  return (
    window.location.pathname === '/reset-password' ||
    window.location.hash.includes('type=recovery') ||
    window.location.search.includes('type=recovery')
  );
}

function redirectToResetPassword() {
  if (typeof window === 'undefined') return;
  if (window.location.pathname !== '/reset-password') {
    window.location.replace('/reset-password');
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingAccess, setIsLoadingAccess] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [accessState, setAccessState] = useState(getAccessState(null));

  const applySession = useCallback(async (session, event = null) => {
    const currentUser = session?.user ?? null;
    const isRecovery = event === 'PASSWORD_RECOVERY' || isPasswordRecoveryUrl();

    setUser(currentUser);
    setIsAuthenticated(Boolean(session));
    setIsLoadingAuth(false);
    setAuthChecked(true);

    if (!currentUser) {
      setSubscription(null);
      setAccessState(getAccessState(null));
      setIsLoadingAccess(false);
      return;
    }

    if (isRecovery) {
      redirectToResetPassword();
    } else {
      syncMailerLiteSubscriber(currentUser);
      void campaignAnalytics.milestone('CompleteRegistration', currentUser);
    }

    setIsLoadingAccess(true);
    try {
      const userSubscription = await getUserSubscription(currentUser.id);
      setSubscription(userSubscription);
      setAccessState(getAccessState(userSubscription, new Date(), currentUser));
    } catch (error) {
      console.error("No se pudo consultar la suscripción", error);
      setSubscription(null);
      setAccessState(getAccessState(null, new Date(), currentUser));
    } finally {
      setIsLoadingAccess(false);
    }
  }, []);

  useEffect(() => {
    campaignAnalytics.captureAttribution();
    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const timers = new Set();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase requests must run outside the Auth callback's session lock.
      const timer = setTimeout(() => {
        timers.delete(timer);
        applySession(session, event);
      }, 0);
      timers.add(timer);
    });

    return () => {
      subscription.unsubscribe();
      timers.forEach(clearTimeout);
    };
  }, [applySession]);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    const { data: { session } } = await supabase.auth.getSession();
    await applySession(session);
  }, [applySession]);

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingAccess,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      authChecked,
      subscription,
      accessState,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState: checkUserAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
