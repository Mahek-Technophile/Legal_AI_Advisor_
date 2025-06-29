import { supabase } from '../lib/supabase';
import { SubscriptionPlan, TOKEN_COSTS } from './subscriptionService';

// RevenueCat product IDs
export const REVENUE_CAT_PRODUCTS = {
  TOKENS_50: 'tokens_50',
  TOKENS_100: 'tokens_100',
  TOKENS_500: 'tokens_500',
  TOKENS_1000: 'tokens_1000',
  SUBSCRIPTION_STARTER: 'subscription_starter',
  SUBSCRIPTION_PRO: 'subscription_pro'
};

// Token packages
export const TOKEN_PACKAGES = [
  {
    id: REVENUE_CAT_PRODUCTS.TOKENS_50,
    name: '50 Tokens',
    tokens: 50,
    price: 4.99,
    description: 'Perfect for occasional use',
    popular: false
  },
  {
    id: REVENUE_CAT_PRODUCTS.TOKENS_100,
    name: '100 Tokens',
    tokens: 100,
    price: 8.99,
    description: 'Great value for regular users',
    popular: true
  },
  {
    id: REVENUE_CAT_PRODUCTS.TOKENS_500,
    name: '500 Tokens',
    tokens: 500,
    price: 39.99,
    description: 'Best value for power users',
    popular: false
  },
  {
    id: REVENUE_CAT_PRODUCTS.TOKENS_1000,
    name: '1000 Tokens',
    tokens: 1000,
    price: 69.99,
    description: 'Professional usage',
    popular: false
  }
];

// RevenueCat service
class RevenueCatService {
  private isInitialized = false;
  private apiKey: string = '';
  private userId: string | null = null;
  private customerInfo: any = null;

  constructor() {
    console.log('RevenueCat service initialized (web implementation)');
    this.apiKey = import.meta.env.VITE_REVENUECAT_API_KEY || '';
  }

  /**
   * Initialize RevenueCat with API key and user ID
   */
  async initialize(userId?: string): Promise<boolean> {
    try {
      if (userId) {
        this.userId = userId;
      }
      
      // In a real implementation, we would initialize RevenueCat SDK here
      // For web, we'll use a mock implementation
      this.isInitialized = true;
      
      console.log('RevenueCat initialized for user:', this.userId);
      return true;
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      return false;
    }
  }

  /**
   * Get available token packages
   */
  async getTokenPackages(): Promise<typeof TOKEN_PACKAGES> {
    // In a real implementation, we would fetch offerings from RevenueCat
    return TOKEN_PACKAGES;
  }

  /**
   * Get user's subscription status
   */
  async getCustomerInfo(userId?: string): Promise<any> {
    try {
      if (userId) {
        this.userId = userId;
      }

      if (!this.userId) {
        throw new Error('User ID not set');
      }

      // In a real implementation, we would fetch customer info from RevenueCat
      // For web, we'll fetch from Supabase
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', this.userId)
        .single();

      if (error) {
        throw error;
      }

      this.customerInfo = {
        entitlements: {
          active: {
            [data.plan]: {
              identifier: data.plan,
              isActive: data.is_active,
              willRenew: data.is_active,
              periodType: 'normal',
              latestPurchaseDate: data.last_reset_date,
              expirationDate: data.next_reset_date
            }
          }
        },
        activeSubscriptions: data.is_active ? [data.plan] : [],
        allPurchasedProductIdentifiers: [data.plan]
      };

      return this.customerInfo;
    } catch (error) {
      console.error('Error fetching customer info:', error);
      return {
        entitlements: { active: {} },
        activeSubscriptions: [],
        allPurchasedProductIdentifiers: []
      };
    }
  }

  /**
   * Purchase token package
   */
  async purchaseTokens(userId: string, packageId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isInitialized) {
        await this.initialize(userId);
      }

      // Find the package
      const tokenPackage = TOKEN_PACKAGES.find(pkg => pkg.id === packageId);
      if (!tokenPackage) {
        throw new Error('Invalid token package');
      }

      // In a real implementation, we would call RevenueCat purchase API
      // For web demo, we'll simulate a successful purchase by updating Supabase
      
      // Update user's token balance in Supabase
      const { data: subscription, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        throw new Error('Failed to fetch subscription');
      }

      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          tokens_remaining: subscription.tokens_remaining + tokenPackage.tokens,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        throw new Error('Failed to update token balance');
      }

      // Record token purchase
      await supabase.from('token_usage_records').insert({
        user_id: userId,
        feature: 'TOKEN_PURCHASE',
        tokens_used: -tokenPackage.tokens, // Negative to indicate addition
        document_name: `Purchased ${tokenPackage.name}`
      });

      // Log activity
      await supabase.from('user_activity_logs').insert({
        user_id: userId,
        activity_type: 'token_purchase',
        activity_description: `Purchased ${tokenPackage.tokens} tokens`,
        metadata: {
          package_id: packageId,
          package_name: tokenPackage.name,
          tokens: tokenPackage.tokens,
          price: tokenPackage.price
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Token purchase error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get user's purchase history
   */
  async getPurchaseHistory(userId: string): Promise<any[]> {
    try {
      // In a real implementation, we would fetch purchase history from RevenueCat
      // For web demo, we'll fetch from Supabase
      
      const { data, error } = await supabase
        .from('token_usage_records')
        .select('*')
        .eq('user_id', userId)
        .eq('feature', 'TOKEN_PURCHASE')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching purchase history:', error);
      return [];
    }
  }

  /**
   * Purchase subscription
   */
  async purchaseSubscription(userId: string, plan: SubscriptionPlan): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isInitialized) {
        await this.initialize(userId);
      }

      // In a real implementation, we would call RevenueCat purchase API
      // For web, we'll redirect to a checkout page or use Stripe
      
      console.log(`Redirecting to purchase subscription: ${plan}`);
      return { 
        success: false, 
        error: 'Web subscription purchase not implemented. Please use Stripe checkout.' 
      };
    } catch (error) {
      console.error('Subscription purchase error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Restore purchases (for mobile apps)
   */
  async restorePurchases(): Promise<boolean> {
    try {
      // In a real implementation, we would call RevenueCat restore API
      // For web demo, we'll simulate success
      return true;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      return false;
    }
  }

  /**
   * Check if user has entitlement
   */
  async checkEntitlement(entitlement: string): Promise<boolean> {
    try {
      if (!this.customerInfo) {
        await this.getCustomerInfo();
      }

      return !!this.customerInfo?.entitlements?.active?.[entitlement];
    } catch (error) {
      console.error('Error checking entitlement:', error);
      return false;
    }
  }

  /**
   * Get active subscriptions
   */
  async getActiveSubscriptions(): Promise<string[]> {
    try {
      if (!this.customerInfo) {
        await this.getCustomerInfo();
      }

      return this.customerInfo?.activeSubscriptions || [];
    } catch (error) {
      console.error('Error getting active subscriptions:', error);
      return [];
    }
  }
}

export const revenueCatService = new RevenueCatService();