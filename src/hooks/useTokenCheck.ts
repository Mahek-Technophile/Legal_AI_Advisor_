import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';
import { TOKEN_COSTS } from '../services/subscriptionService';

export function useTokenCheck() {
  const navigate = useNavigate();
  const { hasEnoughTokens, deductTokens } = useSubscription();
  const [isCheckingTokens, setIsCheckingTokens] = useState(false);
  const [showInsufficientTokensModal, setShowInsufficientTokensModal] = useState(false);
  const [currentFeature, setCurrentFeature] = useState<string | null>(null);

  const checkAndDeductTokens = useCallback(async (
    feature: keyof typeof TOKEN_COSTS, 
    documentName?: string
  ): Promise<boolean> => {
    setIsCheckingTokens(true);
    setCurrentFeature(feature);
    
    try {
      const hasTokens = await hasEnoughTokens(feature);
      
      if (!hasTokens) {
        setShowInsufficientTokensModal(true);
        return false;
      }
      
      const success = await deductTokens(feature, documentName);
      return success;
    } catch (error) {
      console.error('Error checking tokens:', error);
      return false;
    } finally {
      setIsCheckingTokens(false);
    }
  }, [hasEnoughTokens, deductTokens]);

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