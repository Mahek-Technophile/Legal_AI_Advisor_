import React, { useState } from 'react';
import { Coins, AlertCircle, TrendingUp, Clock, ChevronRight } from 'lucide-react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { SUBSCRIPTION_PLANS, TOKEN_COSTS } from '../../services/subscriptionService';

interface TokenBalanceWidgetProps {
  variant?: 'compact' | 'full';
  onUpgradeClick?: () => void;
  onViewHistoryClick?: () => void;
}

export function TokenBalanceWidget({ 
  variant = 'compact', 
  onUpgradeClick,
  onViewHistoryClick
}: TokenBalanceWidgetProps) {
  const { 
    subscription, 
    loading, 
    isLowOnTokens,
    getUsagePercentage
  } = useSubscription();
  
  const [showTooltip, setShowTooltip] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center space-x-2 bg-charcoal-gray/50 px-3 py-1 rounded-full border border-sapphire-blue/20 animate-pulse">
        <Coins className="h-4 w-4 text-cool-gray" />
        <span className="text-sm text-cool-gray">Loading...</span>
      </div>
    );
  }

  if (!subscription) {
    return null;
  }

  const plan = SUBSCRIPTION_PLANS[subscription.plan];
  const tokensRemaining = subscription.tokens_remaining;
  const usagePercentage = getUsagePercentage();
  const nextResetDate = new Date(subscription.next_reset_date);
  
  // Format next reset date
  const formattedResetDate = nextResetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  // Determine color based on tokens remaining
  const getColorClass = () => {
    if (isLowOnTokens) return 'text-legal-red border-legal-red/30 bg-legal-red/10';
    if (usagePercentage > 70) return 'text-deep-bronze border-deep-bronze/30 bg-deep-bronze/10';
    return 'text-emerald border-emerald/30 bg-emerald/10';
  };

  if (variant === 'compact') {
    return (
      <div className="relative">
        <button
          className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getColorClass()} transition-colors`}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={onViewHistoryClick}
        >
          <Coins className="h-4 w-4" />
          <span className="text-sm font-medium">{tokensRemaining} tokens</span>
        </button>
        
        {showTooltip && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-charcoal-gray rounded-lg shadow-lg border border-sapphire-blue/20 p-3 z-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-off-white font-medium">{plan.name} Plan</span>
              <span className="text-xs text-cool-gray">Resets {formattedResetDate}</span>
            </div>
            
            <div className="mb-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-cool-gray">Usage</span>
                <span className="text-off-white">{subscription.tokens_used} / {plan.tokens}</span>
              </div>
              <div className="w-full bg-midnight-navy/50 rounded-full h-2 mt-1">
                <div 
                  className={`h-2 rounded-full ${
                    usagePercentage > 90 ? 'bg-legal-red' : 
                    usagePercentage > 70 ? 'bg-deep-bronze' : 
                    'bg-emerald'
                  }`}
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>
            </div>
            
            <div className="text-xs text-cool-gray">
              <div className="flex justify-between">
                <span>Document Analysis: {TOKEN_COSTS.DOCUMENT_ANALYSIS} tokens</span>
              </div>
              <div className="flex justify-between">
                <span>DeepSearch: {TOKEN_COSTS.DEEP_SEARCH} tokens</span>
              </div>
            </div>
            
            {isLowOnTokens && (
              <div className="mt-2 text-xs text-legal-red flex items-center space-x-1">
                <AlertCircle className="h-3 w-3" />
                <span>Low on tokens! Consider upgrading.</span>
              </div>
            )}
            
            <button
              onClick={onUpgradeClick}
              className="w-full mt-2 text-xs bg-sapphire-blue text-off-white py-1 px-2 rounded flex items-center justify-center space-x-1"
            >
              <span>Upgrade Plan</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className="bg-charcoal-gray/70 backdrop-blur-xl rounded-xl shadow-sm border border-sapphire-blue/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-off-white">Token Balance</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-cool-gray">{plan.name} Plan</span>
          <div className={`px-2 py-1 text-xs rounded-full border ${getColorClass()}`}>
            {tokensRemaining} tokens remaining
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-cool-gray">Monthly Usage</span>
          <span className="text-off-white">{subscription.tokens_used} / {plan.tokens} tokens</span>
        </div>
        <div className="w-full bg-midnight-navy/50 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${
              usagePercentage > 90 ? 'bg-legal-red' : 
              usagePercentage > 70 ? 'bg-deep-bronze' : 
              'bg-emerald'
            }`}
            style={{ width: `${usagePercentage}%` }}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-midnight-navy/30 rounded-lg p-3 border border-sapphire-blue/10">
          <div className="flex items-center space-x-2 mb-1">
            <TrendingUp className="h-4 w-4 text-cool-gray" />
            <span className="text-sm text-cool-gray">Usage Rate</span>
          </div>
          <p className="text-lg font-medium text-off-white">
            {Math.round(subscription.tokens_used / (plan.tokens / 30))} tokens/day
          </p>
        </div>
        
        <div className="bg-midnight-navy/30 rounded-lg p-3 border border-sapphire-blue/10">
          <div className="flex items-center space-x-2 mb-1">
            <Clock className="h-4 w-4 text-cool-gray" />
            <span className="text-sm text-cool-gray">Resets In</span>
          </div>
          <p className="text-lg font-medium text-off-white">
            {Math.ceil((nextResetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
          </p>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <h4 className="text-sm font-medium text-off-white">Token Costs</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-cool-gray">Document Analysis:</span>
            <span className="text-off-white">{TOKEN_COSTS.DOCUMENT_ANALYSIS} tokens</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cool-gray">DeepSearch:</span>
            <span className="text-off-white">{TOKEN_COSTS.DEEP_SEARCH} tokens</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cool-gray">Clause Explanation:</span>
            <span className="text-off-white">{TOKEN_COSTS.CLAUSE_EXPLANATION} tokens</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cool-gray">Redaction Review:</span>
            <span className="text-off-white">{TOKEN_COSTS.REDACTION_REVIEW} tokens</span>
          </div>
        </div>
      </div>
      
      {isLowOnTokens && (
        <div className="mb-4 bg-legal-red/10 border border-legal-red/20 rounded-lg p-3 flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-legal-red mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-legal-red">Low Token Balance</p>
            <p className="text-xs text-legal-red/80">
              You're running low on tokens. Consider upgrading your plan for more tokens.
            </p>
          </div>
        </div>
      )}
      
      <div className="flex space-x-3">
        <button
          onClick={onUpgradeClick}
          className="flex-1 bg-sapphire-blue text-off-white py-2 px-4 rounded-lg hover:bg-sapphire-blue/90 transition-colors"
        >
          Upgrade Plan
        </button>
        <button
          onClick={onViewHistoryClick}
          className="flex-1 bg-charcoal-gray text-off-white py-2 px-4 rounded-lg border border-sapphire-blue/20 hover:bg-midnight-navy/50 transition-colors"
        >
          View History
        </button>
      </div>
    </div>
  );
}