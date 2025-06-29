import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Shield, Zap, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { SubscriptionPlans } from '../components/subscription/SubscriptionPlans';
import { TokenBalanceWidget } from '../components/subscription/TokenBalanceWidget';
import { TokenUsageHistory } from '../components/subscription/TokenUsageHistory';
import { BuyTokensTab } from '../components/subscription/BuyTokensTab';
import { SubscriptionPlan } from '../services/subscriptionService';

// Salcosta-inspired animated background component
function SalcostaBackground() {
  return (
    <div className="salcosta-background">
      {/* Animated gradient orbs */}
      <div className="floating-orb orb-1"></div>
      <div className="floating-orb orb-2"></div>
      <div className="floating-orb orb-3"></div>
      <div className="floating-orb orb-4"></div>
      <div className="floating-orb orb-5"></div>
      <div className="floating-orb orb-6"></div>
      
      {/* Animated grid overlay */}
      <div className="grid-overlay"></div>
      
      {/* Floating particles */}
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
    </div>
  );
}

export function SubscriptionPage() {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const { subscription, upgradeSubscription, manageSubscription, loading, error } = useSubscription();
  const [activeTab, setActiveTab] = useState<'plans' | 'usage' | 'buy-tokens'>('plans');
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (!user) return;
    
    setUpgrading(true);
    setUpgradeError(null);
    
    try {
      await upgradeSubscription(plan);
      setUpgradeSuccess(true);
    } catch (err) {
      console.error('Error upgrading subscription:', err);
      setUpgradeError('Failed to process subscription upgrade. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    
    try {
      await manageSubscription();
    } catch (err) {
      console.error('Error managing subscription:', err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <SalcostaBackground />
      
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40 content-layer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors text-enhanced-contrast"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
              <div className="h-6 w-px bg-white/30" />
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100/20 p-2 rounded-lg backdrop-blur-sm">
                  <CreditCard className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white text-enhanced-contrast">Subscription</h1>
                  <p className="text-sm text-gray-300 text-enhanced-contrast">Manage your plan and tokens</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 content-layer">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-white/20">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'plans', label: 'Subscription Plans', icon: CreditCard },
                { id: 'buy-tokens', label: 'Buy Tokens', icon: Coins },
                { id: 'usage', label: 'Token Usage', icon: Coins }
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors text-enhanced-contrast ${
                      activeTab === tab.id
                        ? 'border-purple-400 text-purple-400'
                        : 'border-transparent text-gray-400 hover:text-white hover:border-white/30'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Error Message */}
        {(error || upgradeError) && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-300 text-sm text-enhanced-contrast">
              {error || upgradeError}
            </p>
          </div>
        )}

        {/* Success Message */}
        {upgradeSuccess && (
          <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
            <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
            <p className="text-green-300 text-sm text-enhanced-contrast">
              Subscription upgraded successfully! Your new plan is now active.
            </p>
          </div>
        )}

        {/* Current Subscription Summary */}
        {subscription && (
          <div className="mb-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <TokenBalanceWidget 
                  variant="full" 
                  onUpgradeClick={() => setActiveTab('plans')}
                  onViewHistoryClick={() => setActiveTab('usage')}
                />
              </div>
              <div className="bg-charcoal-gray/70 backdrop-blur-xl rounded-xl shadow-sm border border-sapphire-blue/20 p-6">
                <h3 className="text-lg font-semibold text-off-white mb-4">Subscription Management</h3>
                <div className="space-y-4">
                  <button
                    onClick={handleManageSubscription}
                    disabled={subscription.plan === SubscriptionPlan.FREE}
                    className="w-full bg-sapphire-blue text-off-white py-2 px-4 rounded-lg hover:bg-sapphire-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Manage Billing
                  </button>
                  <button
                    onClick={() => setActiveTab('plans')}
                    className="w-full bg-charcoal-gray text-off-white py-2 px-4 rounded-lg border border-sapphire-blue/20 hover:bg-midnight-navy/50 transition-colors"
                  >
                    Change Plan
                  </button>
                  <button
                    onClick={() => setActiveTab('buy-tokens')}
                    className="w-full bg-emerald/20 text-off-white py-2 px-4 rounded-lg border border-emerald/30 hover:bg-emerald/30 transition-colors"
                  >
                    Buy More Tokens
                  </button>
                </div>
                <div className="mt-4 text-xs text-cool-gray">
                  <p>Next billing date: {new Date(subscription.next_reset_date).toLocaleDateString()}</p>
                  <p className="mt-1">Tokens reset on billing date</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-sm border border-white/10 p-6">
            <SubscriptionPlans onSelectPlan={handleSelectPlan} />
          </div>
        )}

        {activeTab === 'buy-tokens' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-sm border border-white/10 p-6">
            <BuyTokensTab />
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-sm border border-white/10 p-6">
            <TokenUsageHistory />
          </div>
        )}
      </div>
    </div>
  );
}

// Token icon component
function Coins({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
  );
}