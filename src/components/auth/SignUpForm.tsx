import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Chrome, CheckCircle, Loader2, Info } from 'lucide-react';
import { useFirebaseAuth } from '../../contexts/FirebaseAuthContext';

interface SignUpFormProps {
  onToggleMode: () => void;
  onSuccess?: () => void;
}

export function SignUpForm({ onToggleMode, onSuccess }: SignUpFormProps) {
  const { signUpWithEmail, signInWithGooglePopup, isConfigured } = useFirebaseAuth();
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (formData.displayName.trim().length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const { user, error } = await signUpWithEmail(
        formData.email, 
        formData.password, 
        formData.displayName
      );
      
      if (error) {
        if (error.includes('already in use')) {
          setErrors({ email: 'An account with this email already exists' });
        } else {
          setErrors({ general: error });
        }
      } else if (user) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrors({});

    try {
      const { user, error } = await signInWithGooglePopup();
      if (error) {
        if (error.includes('popup_closed_by_user')) {
          setErrors({ general: 'Sign-in was cancelled. Please try again.' });
        } else {
          setErrors({ general: 'Failed to sign in with Google. Please try again.' });
        }
      } else if (user) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
        }, 1500);
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleEmailSignUp();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: '' }));
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-6">
        <div className="bg-emerald/20 border border-emerald/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto backdrop-blur-sm">
          <CheckCircle className="h-8 w-8 text-emerald" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-off-white">Account created!</h2>
          <p className="text-cool-gray mt-2">
            Welcome to LegalAI Pro. Please check your email to verify your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-off-white">Create your account</h2>
        <p className="text-cool-gray mt-2">Join LegalAI Pro and get started today</p>
      </div>

      {errors.general && (
        <div className="bg-legal-red/10 border border-legal-red/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
          <AlertCircle className="h-5 w-5 text-legal-red mt-0.5 flex-shrink-0" />
          <p className="text-legal-red/90 text-sm">{errors.general}</p>
        </div>
      )}

      {/* Phone Number Unavailable Notice */}
      <div className="bg-sapphire-blue/10 border border-sapphire-blue/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
        <Info className="h-5 w-5 text-sapphire-blue flex-shrink-0 mt-0.5" />
        <div className="text-sm text-sapphire-blue/90">
          <p className="font-medium">Phone Number Sign-Up Currently Unavailable</p>
          <p className="mt-1 text-sapphire-blue/80">Please use email or Google to create your account. Phone authentication will be available in a future update.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-off-white/90 mb-2">
            Display Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-cool-gray" />
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-sapphire-blue focus:border-transparent transition-colors bg-midnight-navy/50 backdrop-blur-sm text-off-white placeholder-cool-gray ${
                errors.displayName ? 'border-legal-red/50 bg-legal-red/10' : 'border-charcoal-gray'
              }`}
              placeholder="Enter your display name"
              disabled={loading}
              autoComplete="name"
            />
          </div>
          {errors.displayName && (
            <p className="text-legal-red text-sm mt-1">{errors.displayName}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-off-white/90 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-cool-gray" />
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-sapphire-blue focus:border-transparent transition-colors bg-midnight-navy/50 backdrop-blur-sm text-off-white placeholder-cool-gray ${
                errors.email ? 'border-legal-red/50 bg-legal-red/10' : 'border-charcoal-gray'
              }`}
              placeholder="Enter your email"
              disabled={loading}
              autoComplete="email"
            />
          </div>
          {errors.email && (
            <p className="text-legal-red text-sm mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-off-white/90 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-cool-gray" />
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-sapphire-blue focus:border-transparent transition-colors bg-midnight-navy/50 backdrop-blur-sm text-off-white placeholder-cool-gray ${
                errors.password ? 'border-legal-red/50 bg-legal-red/10' : 'border-charcoal-gray'
              }`}
              placeholder="Create a password"
              disabled={loading}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cool-gray hover:text-off-white"
              disabled={loading}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-legal-red text-sm mt-1">{errors.password}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-off-white/90 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-cool-gray" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-sapphire-blue focus:border-transparent transition-colors bg-midnight-navy/50 backdrop-blur-sm text-off-white placeholder-cool-gray ${
                errors.confirmPassword ? 'border-legal-red/50 bg-legal-red/10' : 'border-charcoal-gray'
              }`}
              placeholder="Confirm your password"
              disabled={loading}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cool-gray hover:text-off-white"
              disabled={loading}
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-legal-red text-sm mt-1">{errors.confirmPassword}</p>
          )}
        </div>

        <div>
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              name="acceptTerms"
              checked={formData.acceptTerms}
              onChange={handleInputChange}
              className="h-4 w-4 text-sapphire-blue focus:ring-sapphire-blue border-charcoal-gray rounded mt-1 bg-midnight-navy/50"
              disabled={loading}
            />
            <span className="text-sm text-off-white/90">
              I agree to the{' '}
              <a href="#" className="text-sapphire-blue hover:text-sapphire-blue/80 underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-sapphire-blue hover:text-sapphire-blue/80 underline">Privacy Policy</a>
            </span>
          </label>
          {errors.acceptTerms && (
            <p className="text-legal-red text-sm mt-1">{errors.acceptTerms}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sapphire-blue text-off-white py-3 px-4 rounded-lg hover:bg-sapphire-blue/90 focus:ring-2 focus:ring-sapphire-blue focus:ring-offset-2 focus:ring-offset-midnight-navy transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            <span>Create Account</span>
          )}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-charcoal-gray" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-charcoal-gray text-cool-gray">Or continue with</span>
        </div>
      </div>

      <button
        onClick={handleGoogleSignIn}
        disabled={loading || !isConfigured}
        className="w-full flex items-center justify-center space-x-3 py-3 px-4 border border-charcoal-gray rounded-lg hover:bg-midnight-navy/50 focus:ring-2 focus:ring-sapphire-blue focus:ring-offset-2 focus:ring-offset-midnight-navy transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-midnight-navy/30 backdrop-blur-sm"
      >
        <Chrome className="h-5 w-5 text-cool-gray" />
        <span className="text-off-white font-medium">Continue with Google</span>
      </button>

      <div className="text-center">
        <p className="text-cool-gray">
          Already have an account?{' '}
          <button
            onClick={onToggleMode}
            className="text-sapphire-blue hover:text-sapphire-blue/80 font-medium"
            disabled={loading}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}