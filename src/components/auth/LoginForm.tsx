import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Phone, AlertCircle } from 'lucide-react';
import { firebaseAuth } from '../../lib/firebase';

interface LoginFormProps {
  onToggleMode: () => void;
  onForgotPassword: () => void;
  onSuccess: () => void;
}

export function LoginForm({ onToggleMode, onForgotPassword, onSuccess }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phoneNumber: '',
    verificationCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone' | 'google'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [phoneAuthDisabled, setPhoneAuthDisabled] = useState(false);
  const [googleAuthDisabled, setGoogleAuthDisabled] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handlePhoneSignIn = async () => {
    if (!formData.phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await firebaseAuth.signInWithPhone(formData.phoneNumber);
      setShowVerificationInput(true);
    } catch (error: any) {
      console.error('Phone sign-in error:', error);
      setError(error.message);
      
      // Disable phone auth if billing is not enabled
      if (error.message.includes('Phone authentication is not available')) {
        setPhoneAuthDisabled(true);
        setLoginMethod('email');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!formData.verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await firebaseAuth.verifyPhoneCode(formData.verificationCode);
      onSuccess();
    } catch (error: any) {
      console.error('Code verification error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
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
    
    if (loginMethod === 'phone') {
      if (showVerificationInput) {
        await handleVerifyCode();
      } else {
        await handlePhoneSignIn();
      }
      return;
    }

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

  const resetPhoneAuth = () => {
    setShowVerificationInput(false);
    setFormData(prev => ({ ...prev, verificationCode: '' }));
    setError('');
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

      {/* Login Method Selector */}
      <div className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20">
        <button
          type="button"
          onClick={() => {
            setLoginMethod('email');
            resetPhoneAuth();
          }}
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
            if (!phoneAuthDisabled) {
              setLoginMethod('phone');
              setError('');
            }
          }}
          disabled={phoneAuthDisabled}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            phoneAuthDisabled
              ? 'text-white/30 cursor-not-allowed'
              : loginMethod === 'phone'
              ? 'bg-white/20 text-white shadow-sm border border-white/30'
              : 'text-white/70 hover:text-white'
          }`}
        >
          Phone {phoneAuthDisabled && '(Unavailable)'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!googleAuthDisabled) {
              setLoginMethod('google');
              resetPhoneAuth();
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

        {loginMethod === 'phone' && (
          <>
            {!showVerificationInput ? (
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-white/90 mb-1">
                  Phone number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    required
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/10 backdrop-blur-sm text-white placeholder-white/50"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <p className="mt-1 text-xs text-white/60">
                  Include country code (e.g., +1 for US)
                </p>
              </div>
            ) : (
              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium text-white/90 mb-1">
                  Verification code
                </label>
                <input
                  id="verificationCode"
                  name="verificationCode"
                  type="text"
                  required
                  value={formData.verificationCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/10 backdrop-blur-sm text-white placeholder-white/50"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
                <p className="mt-1 text-xs text-white/60">
                  Enter the code sent to {formData.phoneNumber}
                </p>
                <button
                  type="button"
                  onClick={resetPhoneAuth}
                  className="mt-2 text-sm text-purple-300 hover:text-purple-200"
                >
                  Use different number
                </button>
              </div>
            )}
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
              {loginMethod === 'phone' && !showVerificationInput
                ? 'Sending code...'
                : loginMethod === 'phone' && showVerificationInput
                ? 'Verifying...'
                : loginMethod === 'google'
                ? 'Signing in...'
                : 'Signing in...'}
            </div>
          ) : (
            <>
              {loginMethod === 'phone' && !showVerificationInput
                ? 'Send verification code'
                : loginMethod === 'phone' && showVerificationInput
                ? 'Verify code'
                : loginMethod === 'google'
                ? 'Sign in with Google'
                : 'Sign in'}
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