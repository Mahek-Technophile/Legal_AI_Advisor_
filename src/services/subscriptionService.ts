import { supabase } from '../lib/supabase';
import { loadStripe } from '@stripe/stripe-js';
import { revenueCatService } from './revenueCatService';

// Subscription plans
export enum SubscriptionPlan {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro'
}

// Token costs for different features
export const TOKEN_COSTS = {
  DOCUMENT_ANALYSIS: 15,
  DEEP_SEARCH: 10,
  CLAUSE_EXPLANATION: 5,
  REDACTION_REVIEW: 7
};

// Plan details
export const SUBSCRIPTION_PLANS = {
  [SubscriptionPlan.FREE]: {
    name: 'Free',
    tokens: 50,
    price: 0,
    priceId: '',
    features: [
      'Basic document analysis',
      'Limited legal questions',
      '50 tokens per month',
      'No credit card required'
    ]
  },
  [SubscriptionPlan.STARTER]: {
    name: 'Starter',
    tokens: 500,
    price: 19.99,
    priceId: 'prodf7d1e61386',
    features: [
      'Full document analysis',
      'Unlimited legal questions',
      'DeepSearch access',
      '500 tokens per month',
      'Email support'
    ]
  },
  [SubscriptionPlan.PRO]: {
    name: 'Professional',
    tokens: 2000,
    price: 49.99,
    priceId: 'price_pro_monthly',
    features: [
      'All Starter features',
      'Redaction review',
      'Batch document analysis',
      '2000 tokens per month',
      'Priority support'
    ]
  }
};

// Token usage record
export interface TokenUsageRecord {
  id?: string;
  user_id: string;
  feature: string;
  tokens_used: number;
  document_name?: string;
  created_at?: string;
}

// User subscription data
export interface UserSubscription {
  id?: string;
  user_id: string;
  plan: SubscriptionPlan;
  tokens_remaining: number;
  tokens_used: number;
  last_reset_date: string;
  next_reset_date: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

class SubscriptionService {
  private stripePromise: Promise<any>;
  
  constructor() {
    // Initialize Stripe with your publishable key
    const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
    this.stripePromise = loadStripe(stripeKey);
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserSubscription:', error);
      return null;
    }
  }

  /**
   * Create or update user subscription
   */
  async createOrUpdateSubscription(subscription: UserSubscription): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .upsert(subscription)
        .select()
        .single();

      if (error) {
        console.error('Error updating subscription:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createOrUpdateSubscription:', error);
      return null;
    }
  }

  /**
   * Initialize a free subscription for a new user
   */
  async initializeFreeSubscription(userId: string): Promise<UserSubscription | null> {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const subscription: UserSubscription = {
      user_id: userId,
      plan: SubscriptionPlan.FREE,
      tokens_remaining: SUBSCRIPTION_PLANS[SubscriptionPlan.FREE].tokens,
      tokens_used: 0,
      last_reset_date: now.toISOString(),
      next_reset_date: nextMonth.toISOString(),
      is_active: true
    };

    return this.createOrUpdateSubscription(subscription);
  }

  /**
   * Check if user has enough tokens for a feature
   */
  async hasEnoughTokens(userId: string, feature: keyof typeof TOKEN_COSTS): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription || !subscription.is_active) {
      return false;
    }

    return subscription.tokens_remaining >= TOKEN_COSTS[feature];
  }

  /**
   * Deduct tokens for feature usage
   */
  async deductTokens(userId: string, feature: keyof typeof TOKEN_COSTS, documentName?: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription || !subscription.is_active) {
        return false;
      }

      const tokensToDeduct = TOKEN_COSTS[feature];
      
      if (subscription.tokens_remaining < tokensToDeduct) {
        return false;
      }

      // Update subscription with deducted tokens
      const updatedSubscription: UserSubscription = {
        ...subscription,
        tokens_remaining: subscription.tokens_remaining - tokensToDeduct,
        tokens_used: subscription.tokens_used + tokensToDeduct,
        updated_at: new Date().toISOString()
      };

      // Record token usage
      const usageRecord: TokenUsageRecord = {
        user_id: userId,
        feature,
        tokens_used: tokensToDeduct,
        document_name: documentName
      };

      // Update subscription and record usage in parallel
      const [subscriptionResult, usageResult] = await Promise.all([
        this.createOrUpdateSubscription(updatedSubscription),
        this.recordTokenUsage(usageRecord)
      ]);

      return !!subscriptionResult && !!usageResult;
    } catch (error) {
      console.error('Error in deductTokens:', error);
      return false;
    }
  }

  /**
   * Add tokens to user's balance (for token purchases)
   */
  async addTokens(userId: string, tokensToAdd: number, source: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        return false;
      }

      // Update subscription with added tokens
      const updatedSubscription: UserSubscription = {
        ...subscription,
        tokens_remaining: subscription.tokens_remaining + tokensToAdd,
        updated_at: new Date().toISOString()
      };

      // Record token addition
      const usageRecord: TokenUsageRecord = {
        user_id: userId,
        feature: 'TOKEN_PURCHASE',
        tokens_used: -tokensToAdd, // Negative to indicate addition
        document_name: source
      };

      // Update subscription and record usage in parallel
      const [subscriptionResult, usageResult] = await Promise.all([
        this.createOrUpdateSubscription(updatedSubscription),
        this.recordTokenUsage(usageRecord)
      ]);

      return !!subscriptionResult && !!usageResult;
    } catch (error) {
      console.error('Error in addTokens:', error);
      return false;
    }
  }

  /**
   * Record token usage
   */
  async recordTokenUsage(usageRecord: TokenUsageRecord): Promise<TokenUsageRecord | null> {
    try {
      const { data, error } = await supabase
        .from('token_usage_records')
        .insert(usageRecord)
        .select()
        .single();

      if (error) {
        console.error('Error recording token usage:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in recordTokenUsage:', error);
      return null;
    }
  }

  /**
   * Get token usage history
   */
  async getTokenUsageHistory(userId: string, limit = 50): Promise<TokenUsageRecord[]> {
    try {
      const { data, error } = await supabase
        .from('token_usage_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching token usage history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTokenUsageHistory:', error);
      return [];
    }
  }

  /**
   * Get usage summary by feature
   */
  async getUsageSummaryByFeature(userId: string): Promise<Record<string, number>> {
    try {
      const history = await this.getTokenUsageHistory(userId, 1000);
      
      return history.reduce((summary: Record<string, number>, record) => {
        const feature = record.feature;
        summary[feature] = (summary[feature] || 0) + record.tokens_used;
        return summary;
      }, {});
    } catch (error) {
      console.error('Error in getUsageSummaryByFeature:', error);
      return {};
    }
  }

  /**
   * Create checkout session for subscription
   */
  async createCheckoutSession(userId: string, plan: SubscriptionPlan): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          userId,
          plan,
          successUrl: `${window.location.origin}/subscription/success`,
          cancelUrl: `${window.location.origin}/subscription/cancel`
        }
      });

      if (error) {
        console.error('Error creating checkout session:', error);
        return null;
      }

      return data.sessionId;
    } catch (error) {
      console.error('Error in createCheckoutSession:', error);
      return null;
    }
  }

  /**
   * Create portal session for managing subscription
   */
  async createPortalSession(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          userId,
          returnUrl: `${window.location.origin}/settings`
        }
      });

      if (error) {
        console.error('Error creating portal session:', error);
        return null;
      }

      return data.url;
    } catch (error) {
      console.error('Error in createPortalSession:', error);
      return null;
    }
  }

  /**
   * Redirect to Stripe Checkout
   */
  async redirectToCheckout(userId: string, plan: SubscriptionPlan): Promise<void> {
    const sessionId = await this.createCheckoutSession(userId, plan);
    
    if (!sessionId) {
      throw new Error('Failed to create checkout session');
    }

    const stripe = await this.stripePromise;
    const { error } = await stripe.redirectToCheckout({ sessionId });
    
    if (error) {
      console.error('Error redirecting to checkout:', error);
      throw new Error('Failed to redirect to checkout');
    }
  }

  /**
   * Redirect to Stripe Customer Portal
   */
  async redirectToCustomerPortal(userId: string): Promise<void> {
    const url = await this.createPortalSession(userId);
    
    if (!url) {
      throw new Error('Failed to create portal session');
    }

    window.location.href = url;
  }

  /**
   * Purchase tokens using RevenueCat
   */
  async purchaseTokens(userId: string, packageId: string): Promise<{ success: boolean; error?: string }> {
    return revenueCatService.purchaseTokens(userId, packageId);
  }

  /**
   * Check if a feature is available on the current plan
   */
  async isFeatureAvailable(userId: string, feature: keyof typeof TOKEN_COSTS): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription || !subscription.is_active) {
      return false;
    }

    // Check plan-specific restrictions
    if (feature === 'REDACTION_REVIEW' && subscription.plan === SubscriptionPlan.FREE) {
      return false;
    }

    return true;
  }

  /**
   * Get token usage percentage
   */
  async getTokenUsagePercentage(userId: string): Promise<number> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription) {
      return 0;
    }

    const plan = SUBSCRIPTION_PLANS[subscription.plan];
    const totalTokens = plan.tokens;
    const usedTokens = subscription.tokens_used;
    
    return Math.min(100, Math.round((usedTokens / totalTokens) * 100));
  }

  /**
   * Check if user is low on tokens (below 10%)
   */
  async isLowOnTokens(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription) {
      return false;
    }

    const plan = SUBSCRIPTION_PLANS[subscription.plan];
    const totalTokens = plan.tokens;
    const remainingTokens = subscription.tokens_remaining;
    
    return (remainingTokens / totalTokens) < 0.1;
  }

  /**
   * Reset monthly tokens (would be called by a cron job)
   */
  async resetMonthlyTokens(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        return false;
      }

      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const plan = SUBSCRIPTION_PLANS[subscription.plan];
      
      const updatedSubscription: UserSubscription = {
        ...subscription,
        tokens_remaining: plan.tokens,
        tokens_used: 0,
        last_reset_date: now.toISOString(),
        next_reset_date: nextMonth.toISOString(),
        updated_at: now.toISOString()
      };

      const result = await this.createOrUpdateSubscription(updatedSubscription);
      return !!result;
    } catch (error) {
      console.error('Error in resetMonthlyTokens:', error);
      return false;
    }
  }

  /**
   * Upgrade subscription plan
   */
  async upgradeSubscription(userId: string, plan: SubscriptionPlan): Promise<boolean> {
    try {
      // In a real implementation, this would redirect to RevenueCat or Stripe checkout
      // For demo purposes, we'll just update the subscription directly
      
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        return false;
      }

      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const planDetails = SUBSCRIPTION_PLANS[plan];
      
      const updatedSubscription: UserSubscription = {
        ...subscription,
        plan,
        tokens_remaining: planDetails.tokens,
        tokens_used: 0,
        last_reset_date: now.toISOString(),
        next_reset_date: nextMonth.toISOString(),
        updated_at: now.toISOString()
      };

      const result = await this.createOrUpdateSubscription(updatedSubscription);
      
      // Log activity
      await supabase.from('user_activity_logs').insert({
        user_id: userId,
        activity_type: 'subscription_upgrade',
        activity_description: `Upgraded to ${planDetails.name} plan`,
        metadata: {
          previous_plan: subscription.plan,
          new_plan: plan,
          tokens: planDetails.tokens
        }
      });
      
      return !!result;
    } catch (error) {
      console.error('Error in upgradeSubscription:', error);
      return false;
    }
  }

  /**
   * Manage subscription (open customer portal)
   */
  async manageSubscription(userId: string): Promise<boolean> {
    try {
      // In a real implementation, this would redirect to RevenueCat or Stripe customer portal
      // For demo purposes, we'll just log the action
      
      await supabase.from('user_activity_logs').insert({
        user_id: userId,
        activity_type: 'subscription_manage',
        activity_description: 'Opened subscription management portal',
        metadata: {}
      });
      
      return true;
    } catch (error) {
      console.error('Error in manageSubscription:', error);
      return false;
    }
  }
}

export const subscriptionService = new SubscriptionService();