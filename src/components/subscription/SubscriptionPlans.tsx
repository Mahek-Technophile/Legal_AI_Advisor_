import React from 'react';
import { CheckCircle, ChevronRight, Shield, Zap, Clock, Users } from 'lucide-react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../../services/subscriptionService';

interface SubscriptionPlansProps {
  onSelectPlan: (plan: SubscriptionPlan) => void;
}

export function SubscriptionPlans({ onSelectPlan }: SubscriptionPlansProps) {
  const { subscription, loading } = useSubscription();
  
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sapphire-blue mx-auto mb-4"></div>
        <p className="text-cool-gray">Loading subscription plans...</p>
      </div>
    );
  }

  const currentPlan = subscription?.plan || SubscriptionPlan.FREE;
  
  const plans = [
    {
      id: SubscriptionPlan.FREE,
      name: SUBSCRIPTION_PLANS[SubscriptionPlan.FREE].name,
      price: SUBSCRIPTION_PLANS[SubscriptionPlan.FREE].price,
      tokens: SUBSCRIPTION_PLANS[SubscriptionPlan.FREE].tokens,
      features: SUBSCRIPTION_PLANS[SubscriptionPlan.FREE].features,
      icon: Shield,
      color: 'bg-charcoal-gray/50 text-cool-gray',
      borderColor: 'border-charcoal-gray',
      buttonColor: 'bg-charcoal-gray/50 text-off-white'
    },
    {
      id: SubscriptionPlan.STARTER,
      name: SUBSCRIPTION_PLANS[SubscriptionPlan.STARTER].name,
      price: SUBSCRIPTION_PLANS[SubscriptionPlan.STARTER].price,
      tokens: SUBSCRIPTION_PLANS[SubscriptionPlan.STARTER].tokens,
      features: SUBSCRIPTION_PLANS[SubscriptionPlan.STARTER].features,
      icon: Zap,
      color: 'bg-sapphire-blue/10 text-sapphire-blue',
      borderColor: 'border-sapphire-blue/30',
      buttonColor: 'bg-sapphire-blue text-off-white'
    },
    {
      id: SubscriptionPlan.PRO,
      name: SUBSCRIPTION_PLANS[SubscriptionPlan.PRO].name,
      price: SUBSCRIPTION_PLANS[SubscriptionPlan.PRO].price,
      tokens: SUBSCRIPTION_PLANS[SubscriptionPlan.PRO].tokens,
      features: SUBSCRIPTION_PLANS[SubscriptionPlan.PRO].features,
      icon: Users,
      color: 'bg-regal-purple/10 text-regal-purple',
      borderColor: 'border-regal-purple/30',
      buttonColor: 'bg-regal-purple text-off-white'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-off-white mb-2">Choose Your Plan</h2>
        <p className="text-cool-gray max-w-2xl mx-auto">
          Select the plan that best fits your legal analysis needs. All plans include access to our AI-powered legal tools with varying token allocations.
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const IconComponent = plan.icon;
          const isCurrentPlan = currentPlan === plan.id;
          
          return (
            <div 
              key={plan.id}
              className={`bg-charcoal-gray/70 backdrop-blur-xl rounded-xl shadow-sm border ${
                isCurrentPlan ? plan.borderColor : 'border-sapphire-blue/20'
              } p-6 flex flex-col ${
                isCurrentPlan ? 'ring-2 ring-offset-2 ring-offset-midnight-navy ring-sapphire-blue' : ''
              }`}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-2 rounded-lg ${plan.color}`}>
                  <IconComponent className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-off-white">{plan.name}</h3>
                  {isCurrentPlan && (
                    <span className="text-xs text-sapphire-blue">Current Plan</span>
                  )}
                </div>
              </div>
              
              <div className="mb-4">
                <span className="text-3xl font-bold text-off-white">${plan.price}</span>
                <span className="text-cool-gray">/month</span>
              </div>
              
              <div className="flex items-center space-x-2 mb-4 bg-midnight-navy/30 px-3 py-2 rounded-lg">
                <Coins className="h-4 w-4 text-cool-gray" />
                <span className="text-off-white">{plan.tokens} tokens per month</span>
              </div>
              
              <ul className="space-y-3 mb-6 flex-1">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-emerald mt-0.5 flex-shrink-0" />
                    <span className="text-cool-gray">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => onSelectPlan(plan.id)}
                disabled={isCurrentPlan}
                className={`w-full py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                  isCurrentPlan 
                    ? 'bg-charcoal-gray/50 text-cool-gray cursor-not-allowed' 
                    : `${plan.buttonColor} hover:opacity-90`
                }`}
              >
                <span>{isCurrentPlan ? 'Current Plan' : 'Select Plan'}</span>
                {!isCurrentPlan && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          );
        })}
      </div>
      
      <div className="text-center text-sm text-cool-gray">
        <p>All plans automatically renew monthly. You can cancel or change your plan at any time.</p>
        <p className="mt-1">Need more tokens? Contact us for custom enterprise plans.</p>
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