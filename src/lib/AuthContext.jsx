import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getAccessState, getUserSubscription } from '@/lib/access';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingAccess, setIsLoadingAccess] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [accessState, setAccessState] = useState(getAccessState(null));

  const applySession = useCallback(async (session) => {
    const currentUser = session?.user ?? null;

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

    setIsLoadingAccess(true);
    try {
      const userSubscription = await getUserSubscription(currentUser.id);
      setSubscription(userSubscription);
      setAccessState(getAccessState(userSubscription));
    } catch (error) {
      console.error("No se pudo consultar la suscripción", error);
      setSubscription(null);
      setAccessState(getAccessState(null));
    } finally {
      setIsLoadingAccess(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => subscription.unsubscribe();
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
