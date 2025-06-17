import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sessionUtils } from '../lib/supabase';

export function useAuthGuard() {
  const { user, isSupabaseConnected, session, refreshSession } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authFeature, setAuthFeature] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  // Validate session periodically
  useEffect(() => {
    if (!user || !isSupabaseConnected) return;

    const validateSession = async () => {
      const validSession = await sessionUtils.getValidSession();
      if (!validSession && user) {
        console.log('Session validation failed, refreshing...');
        await refreshSession();
      }
    };

    // Check session validity every 5 minutes
    const interval = setInterval(validateSession, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user, isSupabaseConnected, refreshSession]);

  const requireAuth = useCallback(async (featureName: string = 'this feature') => {
    setIsCheckingAuth(true);
    
    try {
      if (!isSupabaseConnected) {
        alert('Please connect to Supabase first to enable authentication features.');
        return false;
      }
      
      // Check if user exists
      if (!user) {
        setAuthFeature(featureName);
        setShowAuthModal(true);
        return false;
      }

      // Validate current session
      const validSession = await sessionUtils.getValidSession();
      if (!validSession) {
        console.log('Session invalid, requiring re-authentication');
        setAuthFeature(featureName);
        setShowAuthModal(true);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in requireAuth:', error);
      setAuthFeature(featureName);
      setShowAuthModal(true);
      return false;
    } finally {
      setIsCheckingAuth(false);
    }
  }, [user, isSupabaseConnected]);

  const closeAuthModal = useCallback(() => {
    setShowAuthModal(false);
    setAuthFeature('');
  }, []);

  // Check if user has valid authentication
  const isAuthenticated = useCallback(() => {
    return !!(user && session && sessionUtils.isSessionValid(session));
  }, [user, session]);

  return {
    user,
    session,
    isAuthenticated: isAuthenticated(),
    requireAuth,
    showAuthModal,
    authFeature,
    closeAuthModal,
    isCheckingAuth,
  };
}