import React from 'react';
import { X, AlertCircle } from 'lucide-react';

interface InsufficientTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  onUpgrade: () => void;
}

export function InsufficientTokensModal({ 
  isOpen, 
  onClose, 
  feature,
  onUpgrade
}: InsufficientTokensModalProps) {
  if (!isOpen) return null;

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
              You don't have enough tokens to use this feature.
            </p>
          </div>
          
          <div className="space-y-4">
            <p className="text-cool-gray">
              To continue using <span className="text-off-white font-medium">{feature}</span>, you can:
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="bg-sapphire-blue/20 p-2 rounded-lg mt-1">
                  <svg className="h-4 w-4 text-sapphire-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-off-white">Upgrade Your Plan</h3>
                  <p className="text-sm text-cool-gray">Get more tokens monthly with a higher tier subscription</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-emerald/20 p-2 rounded-lg mt-1">
                  <svg className="h-4 w-4 text-emerald" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="8" r="6"></circle>
                    <path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path>
                    <path d="M7 6h1v4"></path>
                    <path d="m16.71 13.88.7.71-2.82 2.82"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-off-white">Buy Additional Tokens</h3>
                  <p className="text-sm text-cool-gray">Purchase token packages to use immediately</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onUpgrade}
              className="flex-1 bg-sapphire-blue text-off-white py-2 px-4 rounded-lg hover:bg-sapphire-blue/90 transition-colors"
            >
              Upgrade Plan
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-charcoal-gray text-off-white py-2 px-4 rounded-lg border border-sapphire-blue/20 hover:bg-midnight-navy/50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}