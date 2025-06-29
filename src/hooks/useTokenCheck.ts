import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';
import { TOKEN_COSTS } from '../services/subscriptionService';

export function useTokenCheck() {
  const navigate = useNavigate();
  const { hasEnoughTokens, deductTokens, isFeatureAvailable } = useSubscription();
  const [isCheckingTokens, setIsCheckingTokens] = useState(false);
  const [showInsufficientTokensModal, setShowInsufficientTokensModal] = useState(false);
  const [currentFeature, setCurrentFeature] = useState<keyof typeof TOKEN_COSTS | null>(null);

  const checkAndDeductTokens = useCallback(async (
    feature: keyof typeof TOKEN_COSTS, 
    documentName?: string
  ): Promise<boolean> => {
    setIsCheckingTokens(true);
    setCurrentFeature(feature);
    
    try {
      // First check if feature is available on current plan
      const featureAvailable = await isFeatureAvailable(feature);
      if (!featureAvailable) {
        setShowInsufficientTokensModal(true);
        return false;
      }
      
      // Then check if user has enough tokens
      const hasTokens = await hasEnoughTokens(feature);
      if (!hasTokens) {
        setShowInsufficientTokensModal(true);
        return false;
      }
      
      // Deduct tokens
      const success = await deductTokens(feature, documentName);
      return success;
    } catch (error) {
      console.error('Error checking tokens:', error);
      return false;
    } finally {
      setIsCheckingTokens(false);
    }
  }, [hasEnoughTokens, deductTokens, isFeatureAvailable]);

  const closeInsufficientTokensModal = useCallback(() => {
    setShowInsufficientTokensModal(false);
  }, []);

  const handleUpgradeSubscription = useCallback(() => {
    setShowInsufficientTokensModal(false);
    navigate('/subscription');
  }, [navigate]);

  return {
    checkAndDeductTokens,
    isCheckingTokens,
    showInsufficientTokensModal,
    closeInsufficientTokensModal,
    handleUpgradeSubscription,
    currentFeature
  };
}