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
import { revenueCatService } from '../services/revenueCatService';
import { createOrGetUserProfile } from '../lib/firebase';

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  loading: boolean;
  error: string | null;
  usageHistory: TokenUsageRecord[];
  usageSummary: Record<string, number>;
  hasEnoughTokens: (feature: keyof typeof TOKEN_COSTS) => Promise<boolean>;
  deductTokens: (feature: keyof typeof TOKEN_COSTS, documentName?: string) => Promise<boolean>;
  upgradeSubscription: (plan: SubscriptionPlan) => Promise<void>;
  manageSubscription: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  getTokensForFeature: (feature: keyof typeof TOKEN_COSTS) => number;
  getUsagePercentage: () => number;
  isLowOnTokens: boolean;
  isFeatureAvailable: (feature: keyof typeof TOKEN_COSTS) => Promise<boolean>;
  loadUsageHistory: () => Promise<void>;
  purchaseTokens: (packageId: string) => Promise<{ success: boolean; error?: string }>;
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
      // Initialize RevenueCat
      revenueCatService.initialize();
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
      // Create or get user profile to ensure it exists in Supabase
      const profile = await createOrGetUserProfile(user);
      
      if (!profile) {
        throw new Error('Failed to create or retrieve user profile');
      }
      
      // Use the UUID from the profile, not the Firebase UID
      setUserProfileId(profile.id);
      await loadUserSubscription(profile.id);
      
    } catch (err) {
      console.error('Error initializing user profile:', err);
      setError('Failed to initialize user profile');
      setLoading(false);
    }
  };

  const loadUserSubscription = async (profileId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      let userSubscription = await subscriptionService.getUserSubscription(profileId);
      
      // If no subscription exists, create a free one
      if (!userSubscription) {
        userSubscription = await subscriptionService.initializeFreeSubscription(profileId);
      }
      
      setSubscription(userSubscription);
      
      // Load usage history and summary
      await loadUsageHistory();
      
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const loadUsageHistory = async () => {
    if (!userProfileId) return;
    
    try {
      const history = await subscriptionService.getTokenUsageHistory(userProfileId);
      setUsageHistory(history);
      
      const summary = await subscriptionService.getUsageSummaryByFeature(userProfileId);
      setUsageSummary(summary);
    } catch (err) {
      console.error('Error loading usage history:', err);
    }
  };

  const hasEnoughTokens = async (feature: keyof typeof TOKEN_COSTS): Promise<boolean> => {
    if (!userProfileId) return false;
    return subscriptionService.hasEnoughTokens(userProfileId, feature);
  };

  const deductTokens = async (feature: keyof typeof TOKEN_COSTS, documentName?: string): Promise<boolean> => {
    if (!userProfileId) return false;
    
    try {
      const success = await subscriptionService.deductTokens(userProfileId, feature, documentName);
      
      if (success) {
        // Refresh subscription data
        await refreshSubscription();
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error deducting tokens:', err);
      return false;
    }
  };

  const upgradeSubscription = async (plan: SubscriptionPlan): Promise<void> => {
    if (!userProfileId) throw new Error('User not authenticated');
    
    try {
      await subscriptionService.redirectToCheckout(userProfileId, plan);
    } catch (err) {
      console.error('Error upgrading subscription:', err);
      throw err;
    }
  };

  const manageSubscription = async (): Promise<void> => {
    if (!userProfileId) throw new Error('User not authenticated');
    
    try {
      await subscriptionService.redirectToCustomerPortal(userProfileId);
    } catch (err) {
      console.error('Error managing subscription:', err);
      throw err;
    }
  };

  const refreshSubscription = async (): Promise<void> => {
    if (!userProfileId) return;
    
    try {
      const refreshedSubscription = await subscriptionService.getUserSubscription(userProfileId);
      setSubscription(refreshedSubscription);
      
      // Also refresh usage history
      await loadUsageHistory();
    } catch (err) {
      console.error('Error refreshing subscription:', err);
    }
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

  const purchaseTokens = async (packageId: string): Promise<{ success: boolean; error?: string }> => {
    if (!userProfileId) return { success: false, error: 'User not authenticated' };
    
    try {
      const result = await subscriptionService.purchaseTokens(userProfileId, packageId);
      
      if (result.success) {
        await refreshSubscription();
      }
      
      return result;
    } catch (err) {
      console.error('Error purchasing tokens:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      };
    }
  };

  const value = {
    subscription,
    loading,
    error,
    usageHistory,
    usageSummary,
    hasEnoughTokens,
    deductTokens,
    upgradeSubscription,
    manageSubscription,
    refreshSubscription,
    getTokensForFeature,
    getUsagePercentage,
    isLowOnTokens,
    isFeatureAvailable,
    loadUsageHistory,
    purchaseTokens
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}