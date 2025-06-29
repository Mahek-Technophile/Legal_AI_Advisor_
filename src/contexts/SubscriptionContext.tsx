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
      // Create or get user profile to ensure it exists in Supabase
      const profile = await createOrGetUserProfile(user);
      
      if (!profile) {
        throw new Error('Failed to create or retrieve user profile');
      }
      
      // Use the UUID from the profile, not the Firebase UID
      setUserProfileId(profile.id);
      
      // Create a mock subscription for now
      const mockSubscription: UserSubscription = {
        user_id: profile.id,
        plan: SubscriptionPlan.FREE,
        tokens_remaining: 50,
        tokens_used: 0,
        last_reset_date: new Date().toISOString(),
        next_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true
      };
      
      setSubscription(mockSubscription);
      setLoading(false);
      
    } catch (err) {
      console.error('Error initializing user profile:', err);
      setError('Failed to initialize user profile');
      setLoading(false);
    }
  };

  const loadUsageHistory = async () => {
    // For now, we'll just use mock data
    setUsageHistory([]);
    setUsageSummary({});
  };

  const hasEnoughTokens = async (feature: keyof typeof TOKEN_COSTS): Promise<boolean> => {
    if (!subscription) return false;
    const tokensRequired = TOKEN_COSTS[feature];
    return subscription.tokens_remaining >= tokensRequired;
  };

  const deductTokens = async (feature: keyof typeof TOKEN_COSTS, documentName?: string): Promise<boolean> => {
    if (!subscription) return false;
    
    const tokensRequired = TOKEN_COSTS[feature];
    
    if (subscription.tokens_remaining < tokensRequired) {
      return false;
    }
    
    // Update subscription locally
    setSubscription(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tokens_remaining: prev.tokens_remaining - tokensRequired,
        tokens_used: prev.tokens_used + tokensRequired
      };
    });
    
    return true;
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
    if (!subscription) return false;
    
    // All features are available in the free plan for this simplified version
    return true;
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
    loadUsageHistory
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}