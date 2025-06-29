import React from 'react';
import { X, AlertCircle, Coins, ChevronRight } from 'lucide-react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { TOKEN_COSTS, SUBSCRIPTION_PLANS, SubscriptionPlan } from '../../services/subscriptionService';

interface InsufficientTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: keyof typeof TOKEN_COSTS;
  onUpgrade: () => void;
}

export function InsufficientTokensModal({ 
  isOpen, 
  onClose, 
  feature,
  onUpgrade
}: InsufficientTokensModalProps) {
  const { subscription, getTokensForFeature } = useSubscription();

  if (!isOpen) return null;

  const tokensNeeded = getTokensForFeature(feature);
  const tokensRemaining = subscription?.tokens_remaining || 0;
  const tokensShortage = tokensNeeded - tokensRemaining;
  
  const getFeatureName = (feature: keyof typeof TOKEN_COSTS) => {
    switch (feature) {
      case 'DOCUMENT_ANALYSIS':
        return 'Document Analysis';
      case 'DEEP_SEARCH':
        return 'DeepSearch';
      case 'REDACTION_REVIEW':
        return 'Redaction Review';
      case 'CLAUSE_EXPLANATION':
        return 'Clause Explanation';
      default:
        return feature;
    }
  };

  const currentPlan = subscription?.plan || SubscriptionPlan.FREE;
  const nextPlan = currentPlan === SubscriptionPlan.FREE 
    ? SubscriptionPlan.STARTER 
    : SubscriptionPlan.PRO;
  const nextPlanDetails = SUBSCRIPTION_PLANS[nextPlan];

  return (
    <div className="fixed inset-0 bg-midnight-navy/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-charcoal-gray rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-sapphire-blue/20">
        <div className="sticky top-0 bg-charcoal-gray border-b border-sapphire-blue/20 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h1 className="text-lg font-semibold text-off-white flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-legal-red" />
            <span>Insufficient Tokens</span>
          </h1>
          <button
            onClick={onClose}
            className="text-cool-gray hover:text-off-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-legal-red/10 border border-legal-red/20 rounded-lg p-4">
            <p className="text-legal-red">
              You don't have enough tokens to use <strong>{getFeatureName(feature)}</strong>.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-cool-gray">Tokens Required:</span>
              <span className="text-off-white font-medium">{tokensNeeded} tokens</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cool-gray">Your Balance:</span>
              <span className="text-off-white font-medium">{tokensRemaining} tokens</span>
            </div>
            <div className="flex items-center justify-between border-t border-sapphire-blue/20 pt-2">
              <span className="text-cool-gray">Shortage:</span>
              <span className="text-legal-red font-medium">{tokensShortage} tokens</span>
            </div>
          </div>
          
          <div className="bg-sapphire-blue/10 border border-sapphire-blue/20 rounded-lg p-4">
            <h3 className="font-medium text-sapphire-blue mb-2 flex items-center space-x-2">
              <Coins className="h-4 w-4" />
              <span>Upgrade to {nextPlanDetails.name}</span>
            </h3>
            <p className="text-sm text-cool-gray mb-3">
              Get {nextPlanDetails.tokens} tokens per month and access to more features.
            </p>
            <ul className="space-y-1 mb-4">
              {nextPlanDetails.features.slice(0, 3).map((feature, index) => (
                <li key={index} className="text-sm text-off-white flex items-center space-x-2">
                  <div className="w-1 h-1 bg-sapphire-blue rounded-full"></div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between mb-2">
              <span className="text-cool-gray">Monthly Price:</span>
              <span className="text-off-white font-medium">${nextPlanDetails.price}</span>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onUpgrade}
              className="flex-1 bg-sapphire-blue text-off-white py-2 px-4 rounded-lg hover:bg-sapphire-blue/90 transition-colors flex items-center justify-center space-x-2"
            >
              <span>Upgrade Now</span>
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-charcoal-gray text-off-white py-2 px-4 rounded-lg border border-sapphire-blue/20 hover:bg-midnight-navy/50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}