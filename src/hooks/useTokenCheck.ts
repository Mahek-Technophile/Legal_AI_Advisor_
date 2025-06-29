import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function useTokenCheck() {
  const navigate = useNavigate();
  const [isCheckingTokens, setIsCheckingTokens] = useState(false);
  const [showInsufficientTokensModal, setShowInsufficientTokensModal] = useState(false);
  const [currentFeature, setCurrentFeature] = useState<string | null>(null);

  const checkAndDeductTokens = useCallback(async (
    feature: string, 
    documentName?: string
  ): Promise<boolean> => {
    // Since we've removed the token system, always return true
    return true;
  }, []);

  const closeInsufficientTokensModal = useCallback(() => {
    setShowInsufficientTokensModal(false);
  }, []);

  const handleUpgradeSubscription = useCallback(() => {
    setShowInsufficientTokensModal(false);
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