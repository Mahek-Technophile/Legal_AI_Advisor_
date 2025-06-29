import React, { useState, useEffect } from 'react';
import { Coins, CreditCard, CheckCircle, AlertCircle, Loader2, ArrowRight, Info } from 'lucide-react';
import { useFirebaseAuth } from '../../contexts/FirebaseAuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { revenueCatService, TOKEN_PACKAGES } from '../../services/revenueCatService';
import { TOKEN_COSTS } from '../../services/subscriptionService';

export function BuyTokensTab() {
  const { user } = useFirebaseAuth();
  const { subscription, refreshSubscription, purchaseTokens } = useSubscription();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadPurchaseHistory();
  }, []);

  const loadPurchaseHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const history = await revenueCatService.getPurchaseHistory(user.uid);
      setPurchaseHistory(history);
    } catch (err) {
      console.error('Error loading purchase history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackage(packageId);
    setError(null);
    setSuccess(null);
  };

  const handlePurchase = async () => {
    if (!user || !selectedPackage) return;
    
    setPurchaseLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await purchaseTokens(selectedPackage);
      
      if (result.success) {
        const tokenPackage = TOKEN_PACKAGES.find(pkg => pkg.id === selectedPackage);
        setSuccess(`Successfully purchased ${tokenPackage?.tokens} tokens!`);
        await refreshSubscription();
        await loadPurchaseHistory();
        setSelectedPackage(null);
      } else {
        setError(result.error || 'Failed to purchase tokens. Please try again.');
      }
    } catch (err) {
      console.error('Purchase error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setPurchaseLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-off-white mb-2">Buy Additional Tokens</h2>
        <p className="text-cool-gray max-w-2xl mx-auto">
          Need more tokens? Purchase token packages to continue using premium features without changing your subscription plan.
        </p>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-legal-red/10 border border-legal-red/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
          <AlertCircle className="h-5 w-5 text-legal-red mt-0.5 flex-shrink-0" />
          <p className="text-legal-red/90 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-6 bg-emerald/10 border border-emerald/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
          <CheckCircle className="h-5 w-5 text-emerald mt-0.5 flex-shrink-0" />
          <p className="text-emerald/90 text-sm">{success}</p>
        </div>
      )}

      {/* Current Balance */}
      {subscription && (
        <div className="bg-charcoal-gray/70 backdrop-blur-xl rounded-xl shadow-sm border border-sapphire-blue/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-off-white">Current Token Balance</h3>
            <div className="flex items-center space-x-2">
              <Coins className="h-5 w-5 text-sapphire-blue" />
              <span className="text-xl font-bold text-off-white">{subscription.tokens_remaining} tokens</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-midnight-navy/30 rounded-lg p-3 border border-sapphire-blue/10">
              <div className="flex items-center space-x-2 mb-1">
                <Info className="h-4 w-4 text-cool-gray" />
                <span className="text-sm text-cool-gray">Current Plan</span>
              </div>
              <p className="text-lg font-medium text-off-white">
                {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
              </p>
            </div>
            
            <div className="bg-midnight-navy/30 rounded-lg p-3 border border-sapphire-blue/10">
              <div className="flex items-center space-x-2 mb-1">
                <CreditCard className="h-4 w-4 text-cool-gray" />
                <span className="text-sm text-cool-gray">Next Reset</span>
              </div>
              <p className="text-lg font-medium text-off-white">
                {new Date(subscription.next_reset_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Token Packages */}
      <div className="bg-charcoal-gray/70 backdrop-blur-xl rounded-xl shadow-sm border border-sapphire-blue/20 p-6">
        <h3 className="text-xl font-semibold text-off-white mb-4">Select Token Package</h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {TOKEN_PACKAGES.map((pkg) => (
            <div 
              key={pkg.id}
              onClick={() => handleSelectPackage(pkg.id)}
              className={`bg-midnight-navy/50 backdrop-blur-sm rounded-lg p-4 border cursor-pointer transition-all ${
                selectedPackage === pkg.id 
                  ? 'border-sapphire-blue ring-2 ring-sapphire-blue/50' 
                  : 'border-sapphire-blue/20 hover:border-sapphire-blue/50'
              } ${pkg.popular ? 'relative overflow-hidden' : ''}`}
            >
              {pkg.popular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-sapphire-blue text-off-white text-xs font-bold px-3 py-1 transform rotate-0 translate-x-2 -translate-y-0">
                    POPULAR
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between mb-3">
                <div className="bg-sapphire-blue/20 p-2 rounded-lg">
                  <Coins className="h-5 w-5 text-sapphire-blue" />
                </div>
                <span className="text-2xl font-bold text-off-white">${pkg.price}</span>
              </div>
              
              <h4 className="text-lg font-semibold text-off-white mb-1">{pkg.name}</h4>
              <p className="text-sm text-cool-gray mb-3">{pkg.description}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-sapphire-blue font-medium">{pkg.tokens} tokens</span>
                {selectedPackage === pkg.id && (
                  <CheckCircle className="h-5 w-5 text-sapphire-blue" />
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-center">
          <button
            onClick={handlePurchase}
            disabled={!selectedPackage || purchaseLoading}
            className="bg-sapphire-blue text-off-white px-6 py-3 rounded-lg hover:bg-sapphire-blue/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {purchaseLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Purchase Tokens</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
        
        <div className="mt-4 text-center text-sm text-cool-gray">
          <p>Tokens are non-refundable and do not expire as long as your account is active.</p>
        </div>
      </div>

      {/* Token Usage Examples */}
      <div className="bg-charcoal-gray/70 backdrop-blur-xl rounded-xl shadow-sm border border-sapphire-blue/20 p-6">
        <h3 className="text-xl font-semibold text-off-white mb-4">What Can You Do With Tokens?</h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-midnight-navy/30 rounded-lg p-4 border border-sapphire-blue/10">
            <div className="flex items-center space-x-2 mb-2">
              <div className="bg-sapphire-blue/20 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-sapphire-blue" />
              </div>
              <div>
                <h4 className="font-medium text-off-white">Document Analysis</h4>
                <p className="text-xs text-cool-gray">{TOKEN_COSTS.DOCUMENT_ANALYSIS} tokens</p>
              </div>
            </div>
            <p className="text-sm text-cool-gray">Comprehensive legal document analysis with risk assessment</p>
          </div>
          
          <div className="bg-midnight-navy/30 rounded-lg p-4 border border-sapphire-blue/10">
            <div className="flex items-center space-x-2 mb-2">
              <div className="bg-regal-purple/20 p-2 rounded-lg">
                <Search className="h-5 w-5 text-regal-purple" />
              </div>
              <div>
                <h4 className="font-medium text-off-white">DeepSearch</h4>
                <p className="text-xs text-cool-gray">{TOKEN_COSTS.DEEP_SEARCH} tokens</p>
              </div>
            </div>
            <p className="text-sm text-cool-gray">AI-powered legal research with case law and statutes</p>
          </div>
          
          <div className="bg-midnight-navy/30 rounded-lg p-4 border border-sapphire-blue/10">
            <div className="flex items-center space-x-2 mb-2">
              <div className="bg-emerald/20 p-2 rounded-lg">
                <MessageSquare className="h-5 w-5 text-emerald" />
              </div>
              <div>
                <h4 className="font-medium text-off-white">Clause Explanation</h4>
                <p className="text-xs text-cool-gray">{TOKEN_COSTS.CLAUSE_EXPLANATION} tokens</p>
              </div>
            </div>
            <p className="text-sm text-cool-gray">Detailed explanation of specific contract clauses</p>
          </div>
          
          <div className="bg-midnight-navy/30 rounded-lg p-4 border border-sapphire-blue/10">
            <div className="flex items-center space-x-2 mb-2">
              <div className="bg-deep-bronze/20 p-2 rounded-lg">
                <Shield className="h-5 w-5 text-deep-bronze" />
              </div>
              <div>
                <h4 className="font-medium text-off-white">Redaction Review</h4>
                <p className="text-xs text-cool-gray">{TOKEN_COSTS.REDACTION_REVIEW} tokens</p>
              </div>
            </div>
            <p className="text-sm text-cool-gray">Analysis of documents with redacted sections</p>
          </div>
        </div>
      </div>

      {/* Purchase History */}
      <div className="bg-charcoal-gray/70 backdrop-blur-xl rounded-xl shadow-sm border border-sapphire-blue/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-off-white">Purchase History</h3>
          <button
            onClick={loadPurchaseHistory}
            disabled={loading}
            className="flex items-center space-x-2 text-cool-gray hover:text-off-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="text-sm">Refresh</span>
          </button>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-sapphire-blue" />
            <p className="text-cool-gray">Loading purchase history...</p>
          </div>
        ) : purchaseHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-midnight-navy/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-cool-gray uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-cool-gray uppercase tracking-wider">Package</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-cool-gray uppercase tracking-wider">Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sapphire-blue/10">
                {purchaseHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-midnight-navy/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-cool-gray">
                      {formatDate(record.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-off-white">
                      {record.document_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded-full bg-emerald/10 text-emerald">
                        +{Math.abs(record.tokens_used)} tokens
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-cool-gray mx-auto mb-4" />
            <p className="text-cool-gray mb-2">No purchase history found</p>
            <p className="text-cool-gray/70 text-sm">Your token purchases will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}

// MessageSquare icon component
function MessageSquare({ className }: { className?: string }) {
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
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// RefreshCw icon component
function RefreshCw({ className }: { className?: string }) {
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
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}

// Shield icon component
function Shield({ className }: { className?: string }) {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

// FileText icon component
function FileText({ className }: { className?: string }) {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

// Search icon component
function Search({ className }: { className?: string }) {
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
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// CreditCard icon component
function CreditCard({ className }: { className?: string }) {
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
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}