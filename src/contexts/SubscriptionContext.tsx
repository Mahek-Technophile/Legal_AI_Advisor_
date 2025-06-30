import React, { createContext, useContext, useState, useEffect } from 'react';
import { useFirebaseAuth } from './FirebaseAuthContext';
import { 
  subscriptionService, 
  SubscriptionPlan, 
  SUBSCRIPTION_PLANS, 
  TOKEN_COSTS, 
  UserSubscription,
  TokenUsageRecord
} from '../services/subscriptionService';
import { createOrGetUserProfile } from '../lib/firebase';
import { isConfigured as isSupabaseConfigured } from '../lib/supabase';

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  loading: boolean;
  error: string | null;
  usageHistory: TokenUsageRecord[];
  usageSummary: Record<string, number>;
  hasEnoughTokens: (feature: keyof typeof TOKEN_COSTS) => Promise<boolean>;
  deductTokens: (feature: keyof typeof TOKEN_COSTS, documentName?: string) => Promise<boolean>;
  getTokensForFeature: (feature: keyof typeof TOKEN_COSTS) => number;
  getUsagePercentage: () => number;
  isLowOnTokens: boolean;
  isFeatureAvailable: (feature: keyof typeof TOKEN_COSTS) => Promise<boolean>;
  loadUsageHistory: () => Promise<void>;
  upgradeSubscription: (plan: SubscriptionPlan) => Promise<boolean>;
  manageSubscription: () => Promise<boolean>;
  purchaseTokens: (packageId: string) => Promise<{ success: boolean; error?: string }>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useFirebaseAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usageHistory, setUsageHistory] = useState<TokenUsageRecord[]>([]);
  const [usageSummary, setUsageSummary] = useState<Record<string, number>>({});
  const [isLowOnTokens, setIsLowOnTokens] = useState(false);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);

  // Load user subscription when user changes
  useEffect(() => {
    if (user) {
      initializeUserProfile();
    } else {
      setSubscription(null);
      setUserProfileId(null);
      setLoading(false);
    }
  }, [user]);

  // Check if user is low on tokens
  useEffect(() => {
    if (subscription) {
      const plan = SUBSCRIPTION_PLANS[subscription.plan];
      const totalTokens = plan.tokens;
      const remainingTokens = subscription.tokens_remaining;
      
      setIsLowOnTokens((remainingTokens / totalTokens) < 0.1);
    }
  }, [subscription]);

  const initializeUserProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, using mock subscription');
        
        // Create a mock subscription for development
        const mockSubscription: UserSubscription = {
          user_id: user.uid, // Use Firebase UID as fallback
          plan: SubscriptionPlan.FREE,
          tokens_remaining: 50,
          tokens_used: 0,
          last_reset_date: new Date().toISOString(),
          next_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true
        };
        
        setSubscription(mockSubscription);
        setUserProfileId(user.uid);
        setLoading(false);
        return;
      }

      // Create or get user profile to ensure it exists in Supabase
      const profile = await createOrGetUserProfile(user);
      
      if (!profile) {
        throw new Error('Failed to create or retrieve user profile');
      }
      
      // Use the UUID from the profile, not the Firebase UID
      setUserProfileId(profile.id);
      
      // Get user subscription
      const userSubscription = await subscriptionService.getUserSubscription(profile.id);
      
      if (userSubscription) {
        setSubscription(userSubscription);
      } else {
        // Initialize free subscription if none exists
        const newSubscription = await subscriptionService.initializeFreeSubscription(profile.id);
        setSubscription(newSubscription);
      }
      
      // Load usage history
      await loadUsageHistory();
      
      setLoading(false);
      
    } catch (err) {
      console.error('Error initializing user profile:', err);
      
      // If Supabase fails, fall back to Firebase-only mode
      console.warn('Falling back to Firebase-only mode due to Supabase error');
      
      const fallbackSubscription: UserSubscription = {
        user_id: user.uid,
        plan: SubscriptionPlan.FREE,
        tokens_remaining: 50,
        tokens_used: 0,
        last_reset_date: new Date().toISOString(),
        next_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true
      };
      
      setSubscription(fallbackSubscription);
      setUserProfileId(user.uid);
      setError('Database connection unavailable. Some features may be limited. Please check your Supabase configuration.');
      setLoading(false);
    }
  };

  const refreshSubscription = async () => {
    if (!userProfileId) return;
    
    try {
      const userSubscription = await subscriptionService.getUserSubscription(userProfileId);
      if (userSubscription) {
        setSubscription(userSubscription);
      }
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    }
  };

  const loadUsageHistory = async () => {
    if (!userProfileId) return;
    
    try {
      const history = await subscriptionService.getTokenUsageHistory(userProfileId);
      setUsageHistory(history);
      
      const summary = await subscriptionService.getUsageSummaryByFeature(userProfileId);
      setUsageSummary(summary);
    } catch (error) {
      console.error('Error loading usage history:', error);
    }
  };

  const hasEnoughTokens = async (feature: keyof typeof TOKEN_COSTS): Promise<boolean> => {
    if (!userProfileId) return false;
    return subscriptionService.hasEnoughTokens(userProfileId, feature);
  };

  const deductTokens = async (feature: keyof typeof TOKEN_COSTS, documentName?: string): Promise<boolean> => {
    if (!userProfileId) return false;
    
    const result = await subscriptionService.deductTokens(userProfileId, feature, documentName);
    
    if (result) {
      // Refresh subscription data
      await refreshSubscription();
      await loadUsageHistory();
    }
    
    return result;
  };

  const getTokensForFeature = (feature: keyof typeof TOKEN_COSTS): number => {
    return TOKEN_COSTS[feature];
  };

  const getUsagePercentage = (): number => {
    if (!subscription) return 0;
    
    const plan = SUBSCRIPTION_PLANS[subscription.plan];
    const totalTokens = plan.tokens;
    const usedTokens = subscription.tokens_used;
    
    return Math.min(100, Math.round((usedTokens / totalTokens) * 100));
  };

  const isFeatureAvailable = async (feature: keyof typeof TOKEN_COSTS): Promise<boolean> => {
    if (!userProfileId) return false;
    return subscriptionService.isFeatureAvailable(userProfileId, feature);
  };

  const upgradeSubscription = async (plan: SubscriptionPlan): Promise<boolean> => {
    if (!userProfileId) return false;
    
    const result = await subscriptionService.upgradeSubscription(userProfileId, plan);
    
    if (result) {
      // Refresh subscription data
      await refreshSubscription();
    }
    
    return result;
  };

  const manageSubscription = async (): Promise<boolean> => {
    if (!userProfileId) return false;
    return subscriptionService.manageSubscription(userProfileId);
  };

  const purchaseTokens = async (packageId: string): Promise<{ success: boolean; error?: string }> => {
    if (!userProfileId) return { success: false, error: 'User not authenticated' };
    
    const result = await subscriptionService.purchaseTokens(userProfileId, packageId);
    
    if (result.success) {
      // Refresh subscription data
      await refreshSubscription();
      await loadUsageHistory();
    }
    
    return result;
  };

  const value = {
    subscription,
    loading,
    error,
    usageHistory,
    usageSummary,
    hasEnoughTokens,
    deductTokens,
    getTokensForFeature,
    getUsagePercentage,
    isLowOnTokens,
    isFeatureAvailable,
    loadUsageHistory,
    upgradeSubscription,
    manageSubscription,
    purchaseTokens,
    refreshSubscription
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}