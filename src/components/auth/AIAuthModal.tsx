import React, { useState } from 'react';
import { X, Shield, Zap, Users } from 'lucide-react';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';

interface AIAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

export function AIAuthModal({ isOpen, onClose, feature = 'AI tools' }: AIAuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');

  if (!isOpen) return null;

  const handleToggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
  };

  const handleForgotPassword = () => {
    setMode('forgot');
  };

  const handleBack = () => {
    setMode('login');
  };

  const handleSuccess = () => {
    // Close modal after successful authentication
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-midnight-navy/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-charcoal-gray rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-sapphire-blue/20">
        <div className="sticky top-0 bg-charcoal-gray border-b border-sapphire-blue/20 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h1 className="text-lg font-semibold text-off-white">
            Access Required
          </h1>
          <button
            onClick={onClose}
            className="text-cool-gray hover:text-off-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Feature Access Notice */}
          <div className="text-center mb-6 p-4 bg-sapphire-blue/10 border border-sapphire-blue/20 rounded-lg">
            <Shield className="h-8 w-8 text-sapphire-blue mx-auto mb-2" />
            <h2 className="text-lg font-semibold text-off-white mb-2">
              Please log in or create an account to use our {feature}
            </h2>
            <p className="text-cool-gray text-sm">
              Access professional legal AI analysis with your secure account
            </p>
          </div>

          {/* Benefits */}
          <div className="mb-6 space-y-3">
            <div className="flex items-center space-x-3 text-sm text-cool-gray">
              <Zap className="h-4 w-4 text-emerald flex-shrink-0" />
              <span>Instant AI-powered legal analysis</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-cool-gray">
              <Shield className="h-4 w-4 text-sapphire-blue flex-shrink-0" />
              <span>Secure document processing</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-cool-gray">
              <Users className="h-4 w-4 text-regal-purple flex-shrink-0" />
              <span>Save analysis history</span>
            </div>
          </div>

          {/* Auth Forms */}
          {mode === 'login' && (
            <LoginForm 
              onToggleMode={handleToggleMode}
              onForgotPassword={handleForgotPassword}
              onSuccess={handleSuccess}
            />
          )}
          {mode === 'signup' && (
            <SignUpForm 
              onToggleMode={handleToggleMode}
              onSuccess={handleSuccess}
            />
          )}
          {mode === 'forgot' && (
            <ForgotPasswordForm onBack={handleBack} />
          )}
        </div>
      </div>
    </div>
  );
}