import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updatePassword, verifyPasswordResetToken, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [verifyingToken, setVerifyingToken] = useState(true);

  // Extract token from URL parameters
  const token = searchParams.get('token') || searchParams.get('access_token') || '';
  const type = searchParams.get('type');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token || type !== 'recovery') {
        setTokenValid(false);
        setVerifyingToken(false);
        setErrors({ general: 'Invalid password reset link. Please request a new one.' });
        return;
      }

      try {
        const { error, isValid } = await verifyPasswordResetToken(token);
        
        if (error || !isValid) {
          setTokenValid(false);
          setErrors({ general: error?.message || 'Invalid or expired reset link.' });
        } else {
          setTokenValid(true);
        }
      } catch (error) {
        setTokenValid(false);
        setErrors({ general: 'Failed to verify reset link. Please try again.' });
      } finally {
        setVerifyingToken(false);
      }
    };

    verifyToken();
  }, [token, type, verifyPasswordResetToken]);

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('at least 8 characters');
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('one lowercase letter');
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('one uppercase letter');
    }
    
    if (!/(?=.*\d)/.test(password)) {
      errors.push('one number');
    }
    
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?])/.test(password)) {
      errors.push('one special character');
    }
    
    return errors;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Password validation
    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length > 0) {
      newErrors.password = `Password must contain ${passwordErrors.join(', ')}.`;
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !tokenValid) return;

    setSubmitting(true);
    setErrors({});

    try {
      const { error } = await updatePassword(formData.password, token);
      
      if (error) {
        setErrors({ general: error.message });
      } else {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: '' }));
    }
  };

  const getPasswordStrength = (password: string) => {
    const errors = validatePassword(password);
    const strength = 5 - errors.length;
    
    if (strength <= 1) return { level: 'weak', color: 'legal-red', text: 'Weak' };
    if (strength <= 3) return { level: 'medium', color: 'deep-bronze', text: 'Medium' };
    return { level: 'strong', color: 'emerald', text: 'Strong' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  if (verifyingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-midnight-navy via-charcoal-gray to-midnight-navy flex items-center justify-center p-4">
        <div className="bg-charcoal-gray rounded-xl shadow-xl max-w-md w-full p-8 border border-sapphire-blue/20">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-sapphire-blue/10 rounded-xl mb-4">
              <Shield className="h-8 w-8 text-sapphire-blue animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-off-white mb-2">Verifying Reset Link</h2>
            <p className="text-cool-gray">Please wait while we verify your password reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-midnight-navy via-charcoal-gray to-midnight-navy flex items-center justify-center p-4">
        <div className="bg-charcoal-gray rounded-xl shadow-xl max-w-md w-full p-8 border border-legal-red/20">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-legal-red/10 rounded-xl mb-4">
              <AlertCircle className="h-8 w-8 text-legal-red" />
            </div>
            <h2 className="text-2xl font-bold text-off-white mb-2">Invalid Reset Link</h2>
            <p className="text-cool-gray mb-6">
              {errors.general || 'This password reset link is invalid or has expired.'}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="w-full bg-sapphire-blue text-off-white py-3 px-4 rounded-lg hover:bg-sapphire-blue/90 transition-colors font-medium"
              >
                Request New Reset Link
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full flex items-center justify-center space-x-2 text-cool-gray hover:text-off-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Sign In</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-midnight-navy via-charcoal-gray to-midnight-navy flex items-center justify-center p-4">
        <div className="bg-charcoal-gray rounded-xl shadow-xl max-w-md w-full p-8 border border-emerald/20">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald/10 rounded-xl mb-4">
              <CheckCircle className="h-8 w-8 text-emerald" />
            </div>
            <h2 className="text-2xl font-bold text-off-white mb-2">Password Updated!</h2>
            <p className="text-cool-gray mb-6">
              Your password has been successfully updated. You will be redirected to the sign-in page shortly.
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-sapphire-blue text-off-white py-3 px-4 rounded-lg hover:bg-sapphire-blue/90 transition-colors font-medium"
            >
              Continue to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-midnight-navy via-charcoal-gray to-midnight-navy flex items-center justify-center p-4">
      <div className="bg-charcoal-gray rounded-xl shadow-xl max-w-md w-full p-8 border border-sapphire-blue/20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sapphire-blue/10 rounded-xl mb-4">
            <Lock className="h-8 w-8 text-sapphire-blue" />
          </div>
          <h2 className="text-2xl font-bold text-off-white mb-2">Reset Your Password</h2>
          <p className="text-cool-gray">Enter your new password below</p>
        </div>

        {errors.general && (
          <div className="mb-6 bg-legal-red/10 border border-legal-red/20 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-legal-red mt-0.5 flex-shrink-0" />
            <p className="text-legal-red/90 text-sm">{errors.general}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-off-white/90 mb-2">
              New Password
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
                placeholder="Enter your new password"
                disabled={submitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cool-gray hover:text-off-white"
                disabled={submitting}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-charcoal-gray rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        passwordStrength.color === 'legal-red' ? 'bg-legal-red w-1/3' :
                        passwordStrength.color === 'deep-bronze' ? 'bg-deep-bronze w-2/3' :
                        'bg-emerald w-full'
                      }`}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength.color === 'legal-red' ? 'text-legal-red' :
                    passwordStrength.color === 'deep-bronze' ? 'text-deep-bronze' :
                    'text-emerald'
                  }`}>
                    {passwordStrength.text}
                  </span>
                </div>
              </div>
            )}
            
            {errors.password && (
              <p className="text-legal-red text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-off-white/90 mb-2">
              Confirm New Password
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
                placeholder="Confirm your new password"
                disabled={submitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cool-gray hover:text-off-white"
                disabled={submitting}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-legal-red text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="bg-midnight-navy/50 rounded-lg p-4 border border-charcoal-gray">
            <h4 className="text-sm font-medium text-off-white mb-2">Password Requirements:</h4>
            <ul className="text-xs text-cool-gray space-y-1">
              <li className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${formData.password.length >= 8 ? 'bg-emerald' : 'bg-cool-gray/50'}`} />
                <span>At least 8 characters</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${/(?=.*[a-z])/.test(formData.password) ? 'bg-emerald' : 'bg-cool-gray/50'}`} />
                <span>One lowercase letter</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${/(?=.*[A-Z])/.test(formData.password) ? 'bg-emerald' : 'bg-cool-gray/50'}`} />
                <span>One uppercase letter</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${/(?=.*\d)/.test(formData.password) ? 'bg-emerald' : 'bg-cool-gray/50'}`} />
                <span>One number</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?])/.test(formData.password) ? 'bg-emerald' : 'bg-cool-gray/50'}`} />
                <span>One special character</span>
              </li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={submitting || !tokenValid}
            className="w-full bg-sapphire-blue text-off-white py-3 px-4 rounded-lg hover:bg-sapphire-blue/90 focus:ring-2 focus:ring-sapphire-blue focus:ring-offset-2 focus:ring-offset-midnight-navy transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-2 text-cool-gray hover:text-off-white transition-colors"
            disabled={submitting}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
}