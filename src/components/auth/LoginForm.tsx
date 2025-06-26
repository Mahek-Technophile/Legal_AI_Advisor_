import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Chrome, Info } from 'lucide-react';
import { firebaseAuth } from '../../lib/firebase';

interface LoginFormProps {
  onToggleMode: () => void;
  onForgotPassword: () => void;
  onSuccess: () => void;
}

export function LoginForm({ onToggleMode, onForgotPassword, onSuccess }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'google'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleAuthDisabled, setGoogleAuthDisabled] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');

    try {
      await firebaseAuth.signInWithGoogle();
      onSuccess();
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      setError(error.message);
      
      // Disable Google auth if domain is unauthorized
      if (error.message.includes('domain is not authorized')) {
        setGoogleAuthDisabled(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loginMethod === 'google') {
      await handleGoogleSignIn();
      return;
    }

    // Email login
    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await firebaseAuth.signInWithEmail(formData.email, formData.password);
      onSuccess();
    } catch (error: any) {
      console.error('Email sign-in error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Welcome back</h2>
        <p className="mt-2 text-white/70">Sign in to your account</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-300">{error}</div>
        </div>
      )}

      {/* Phone Number Unavailable Notice */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
        <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p className="font-medium">Phone Number Sign-In Currently Unavailable</p>
          <p className="mt-1 text-blue-300/80">Please use email or Google to sign in. Phone authentication will be available in a future update.</p>
        </div>
      </div>

      {/* Login Method Selector */}
      <div className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20">
        <button
          type="button"
          onClick={() => setLoginMethod('email')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            loginMethod === 'email'
              ? 'bg-white/20 text-white shadow-sm border border-white/30'
              : 'text-white/70 hover:text-white'
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => {
            if (!googleAuthDisabled) {
              setLoginMethod('google');
              setError('');
            }
          }}
          disabled={googleAuthDisabled}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            googleAuthDisabled
              ? 'text-white/30 cursor-not-allowed'
              : loginMethod === 'google'
              ? 'bg-white/20 text-white shadow-sm border border-white/30'
              : 'text-white/70 hover:text-white'
          }`}
        >
          Google {googleAuthDisabled && '(Unavailable)'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {loginMethod === 'email' && (
          <>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/10 backdrop-blur-sm text-white placeholder-white/50"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/10 backdrop-blur-sm text-white placeholder-white/50"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/70"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </>
        )}

        {loginMethod === 'google' && (
          <div className="text-center py-8">
            <p className="text-white/70 mb-4">Click the button below to sign in with Google</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              {loginMethod === 'google' ? 'Signing in...' : 'Signing in...'}
            </div>
          ) : (
            <>
              {loginMethod === 'google' ? 'Sign in with Google' : 'Sign in'}
            </>
          )}
        </button>

        {loginMethod === 'email' && (
          <div className="text-center">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-purple-300 hover:text-purple-200"
            >
              Forgot your password?
            </button>
          </div>
        )}
      </form>

      {/* reCAPTCHA container for phone auth */}
      <div id="recaptcha-container"></div>

      <div className="text-center">
        <span className="text-white/70">Don't have an account? </span>
        <button
          onClick={onToggleMode}
          className="text-purple-300 hover:text-purple-200 font-medium"
        >
          Sign up
        </button>
      </div>
    </div>
  );
}