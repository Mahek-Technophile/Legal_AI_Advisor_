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

    // Handle the AuthResult object returned by firebaseAuth.signInWithEmail
    const result = await firebaseAuth.signInWithEmail(formData.email, formData.password);
    
    if (result.error) {
      console.error('Email sign-in error:', result.error);
      setError(result.error);
    } else if (result.user) {
      onSuccess();
    }
    
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-off-white">Welcome back</h2>
        <p className="mt-2 text-cool-gray">Sign in to your account</p>
      </div>

      {error && (
        <div className="bg-legal-red/10 border border-legal-red/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
          <AlertCircle className="h-5 w-5 text-legal-red flex-shrink-0 mt-0.5" />
          <div className="text-sm text-legal-red/90">{error}</div>
        </div>
      )}

      {/* Phone Number Unavailable Notice */}
      <div className="bg-sapphire-blue/10 border border-sapphire-blue/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
        <Info className="h-5 w-5 text-sapphire-blue flex-shrink-0 mt-0.5" />
        <div className="text-sm text-sapphire-blue/90">
          <p className="font-medium">Phone Number Sign-In Currently Unavailable</p>
          <p className="mt-1 text-sapphire-blue/80">Please use email or Google to sign in. Phone authentication will be available in a future update.</p>
        </div>
      </div>

      {/* Login Method Selector */}
      <div className="flex space-x-1 bg-charcoal-gray/80 backdrop-blur-sm rounded-lg p-1 border border-sapphire-blue/20">
        <button
          type="button"
          onClick={() => setLoginMethod('email')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            loginMethod === 'email'
              ? 'bg-sapphire-blue text-off-white shadow-sm border border-sapphire-blue/30'
              : 'text-cool-gray hover:text-off-white'
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
              ? 'text-cool-gray/50 cursor-not-allowed'
              : loginMethod === 'google'
              ? 'bg-sapphire-blue text-off-white shadow-sm border border-sapphire-blue/30'
              : 'text-cool-gray hover:text-off-white'
          }`}
        >
          Google {googleAuthDisabled && '(Unavailable)'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {loginMethod === 'email' && (
          <>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-off-white/90 mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-cool-gray" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-charcoal-gray rounded-lg focus:ring-2 focus:ring-sapphire-blue focus:border-transparent bg-midnight-navy/50 backdrop-blur-sm text-off-white placeholder-cool-gray"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-off-white/90 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-cool-gray" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 border border-charcoal-gray rounded-lg focus:ring-2 focus:ring-sapphire-blue focus:border-transparent bg-midnight-navy/50 backdrop-blur-sm text-off-white placeholder-cool-gray"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cool-gray hover:text-off-white"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </>
        )}

        {loginMethod === 'google' && (
          <div className="text-center py-8">
            <p className="text-cool-gray mb-4">Click the button below to sign in with Google</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-sapphire-blue text-off-white py-3 px-4 rounded-lg font-medium hover:bg-sapphire-blue/90 focus:ring-2 focus:ring-sapphire-blue focus:ring-offset-2 focus:ring-offset-midnight-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-off-white mr-2"></div>
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
              className="text-sm text-sapphire-blue hover:text-sapphire-blue/80"
            >
              Forgot your password?
            </button>
          </div>
        )}
      </form>

      {/* reCAPTCHA container for phone auth */}
      <div id="recaptcha-container"></div>

      <div className="text-center">
        <span className="text-cool-gray">Don't have an account? </span>
        <button
          onClick={onToggleMode}
          className="text-sapphire-blue hover:text-sapphire-blue/80 font-medium"
        >
          Sign up
        </button>
      </div>
    </div>
  );
}