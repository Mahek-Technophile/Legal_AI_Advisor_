import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, Globe, ChevronRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext';

// Salcosta-inspired animated background component
function SalcostaBackground() {
  return (
    <div className="salcosta-background">
      {/* Animated gradient orbs */}
      <div className="floating-orb orb-1"></div>
      <div className="floating-orb orb-2"></div>
      <div className="floating-orb orb-3"></div>
      <div className="floating-orb orb-4"></div>
      <div className="floating-orb orb-5"></div>
      <div className="floating-orb orb-6"></div>
      
      {/* Animated grid overlay */}
      <div className="grid-overlay"></div>
      
      {/* Floating particles */}
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
    </div>
  );
}

export function JurisdictionSelectionPage() {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const [selectedCountry, setSelectedCountry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const countries = [
    { code: 'US', name: 'United States', flag: '🇺🇸', description: 'Federal and state law' },
    { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', description: 'English, Scottish, Welsh, and Northern Irish law' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', description: 'Federal and provincial law' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺', description: 'Commonwealth and state law' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪', description: 'Federal and state law' },
    { code: 'FR', name: 'France', flag: '🇫🇷', description: 'French civil law' },
  ];

  const handleCountrySelect = (countryCode: string) => {
    setSelectedCountry(countryCode);
  };

  const handleContinue = async () => {
    if (!selectedCountry) return;

    setIsSubmitting(true);
    
    try {
      // Save jurisdiction to localStorage
      localStorage.setItem('selectedCountry', selectedCountry);
      
      // Navigate to services page
      navigate('/services');
    } catch (error) {
      console.error('Error saving jurisdiction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <SalcostaBackground />
      
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40 content-layer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors text-enhanced-contrast"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Home</span>
              </button>
              <div className="h-6 w-px bg-white/30" />
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100/20 p-2 rounded-lg backdrop-blur-sm">
                  <Globe className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white text-enhanced-contrast">Select Your Jurisdiction</h1>
                  <p className="text-sm text-gray-300 text-enhanced-contrast">Choose your legal jurisdiction to continue</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                <span className="text-sm font-medium text-white text-enhanced-contrast">
                  Welcome, {user?.displayName || user?.email?.split('@')[0] || 'User'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 content-layer">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full mb-6 animate-glow">
            <Scale className="h-8 w-8 text-white" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-enhanced-contrast">
            Select Your Legal
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Jurisdiction</span>
          </h1>
          
          <p className="text-xl text-white/80 max-w-2xl mx-auto leading-relaxed text-enhanced-contrast">
            Choose your country to receive jurisdiction-specific legal guidance and analysis 
            tailored to your local laws and regulations.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-sm border border-white/10 p-8">
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {countries.map((country) => (
              <button
                key={country.code}
                onClick={() => handleCountrySelect(country.code)}
                className={`flex items-center space-x-4 p-6 rounded-lg border transition-all text-left group ${
                  selectedCountry === country.code
                    ? 'border-purple-400/50 bg-purple-500/20 shadow-lg'
                    : 'border-white/20 hover:border-white/40 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <span className="text-3xl">{country.flag}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-enhanced-contrast">{country.name}</h3>
                    <p className="text-sm text-white/70 text-enhanced-contrast">{country.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {selectedCountry === country.code && (
                    <CheckCircle className="h-5 w-5 text-purple-400" />
                  )}
                  <ChevronRight className="h-5 w-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))}
          </div>

          {selectedCountry && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 mb-6 backdrop-blur-sm">
              <div className="flex items-start space-x-3">
                <Globe className="h-6 w-6 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-200 mb-2 text-enhanced-contrast">
                    Selected: {countries.find(c => c.code === selectedCountry)?.name}
                  </h4>
                  <p className="text-sm text-blue-300 text-enhanced-contrast">
                    You'll receive legal analysis and guidance specific to{' '}
                    {countries.find(c => c.code === selectedCountry)?.description}.
                    This ensures accuracy and relevance for your legal matters.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div className="text-sm text-white/70 text-enhanced-contrast">
              <p>You can change your jurisdiction later in your account settings.</p>
            </div>
            
            <button
              onClick={handleContinue}
              disabled={!selectedCountry || isSubmitting}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Setting up...</span>
                </>
              ) : (
                <>
                  <span>Continue to Services</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-white/60 text-enhanced-contrast">
            <strong>Privacy Notice:</strong> Your jurisdiction selection is stored locally and used only 
            to provide relevant legal information. We do not share this information with third parties.
          </p>
        </div>
      </div>
    </div>
  );
}