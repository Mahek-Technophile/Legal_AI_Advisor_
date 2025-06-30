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
            <span>Feature Unavailable</span>
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
              This feature is currently unavailable in the demo version.
            </p>
          </div>
          
          <div className="flex space-x-3">
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