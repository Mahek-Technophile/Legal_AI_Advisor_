import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);

  // Update mode when initialMode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

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
      {/* Background for modal */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-charcoal-gray rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute top-[20%] right-[-10%] w-80 h-80 bg-sapphire-blue rounded-full opacity-15 blur-3xl"></div>
        <div className="absolute bottom-[10%] left-[20%] w-64 h-64 bg-regal-purple rounded-full opacity-10 blur-3xl"></div>
      </div>

      <div className="relative bg-charcoal-gray/90 backdrop-blur-xl rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-sapphire-blue/20">
        <div className="sticky top-0 bg-charcoal-gray/90 backdrop-blur-xl border-b border-sapphire-blue/20 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h1 className="text-lg font-semibold text-off-white">
            {mode === 'login' && 'Sign In'}
            {mode === 'signup' && 'Sign Up'}
            {mode === 'forgot' && 'Reset Password'}
          </h1>
          <button
            onClick={onClose}
            className="text-cool-gray hover:text-off-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
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