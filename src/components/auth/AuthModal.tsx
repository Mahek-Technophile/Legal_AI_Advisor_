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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Purple blob background for modal */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-purple-500 rounded-full opacity-20 blur-3xl animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-80 h-80 bg-purple-600 rounded-full opacity-15 blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[10%] left-[20%] w-64 h-64 bg-purple-400 rounded-full opacity-10 blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative bg-white/10 backdrop-blur-xl rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/20">
        <div className="sticky top-0 bg-white/10 backdrop-blur-xl border-b border-white/20 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h1 className="text-lg font-semibold text-white">
            {mode === 'login' && 'Sign In'}
            {mode === 'signup' && 'Sign Up'}
            {mode === 'forgot' && 'Reset Password'}
          </h1>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
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