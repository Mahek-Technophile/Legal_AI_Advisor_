import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, Globe, ChevronRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext';

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
    <div className="min-h-screen bg-midnight-navy text-off-white relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        {/* Base dark background */}
        <div className="absolute inset-0 bg-midnight-navy"></div>
        
        {/* Animated gradient orbs */}
        <div className="absolute inset-0">
          {/* Large orb 1 */}
          <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-charcoal-gray rounded-full opacity-30 blur-3xl animate-float"></div>
          
          {/* Large orb 2 */}
          <div className="absolute top-[20%] right-[-10%] w-80 h-80 bg-sapphire-blue rounded-full opacity-20 blur-3xl animate-float animation-delay-2000"></div>
          
          {/* Medium orb 3 */}
          <div className="absolute bottom-[10%] left-[20%] w-64 h-64 bg-regal-purple rounded-full opacity-15 blur-3xl animate-float animation-delay-4000"></div>
          
          {/* Medium orb 4 */}
          <div className="absolute top-[60%] right-[30%] w-72 h-72 bg-sapphire-blue rounded-full opacity-20 blur-3xl animate-float animation-delay-6000"></div>
          
          {/* Small orb 5 */}
          <div className="absolute bottom-[30%] right-[10%] w-48 h-48 bg-charcoal-gray rounded-full opacity-25 blur-2xl animate-float animation-delay-8000"></div>
          
          {/* Small orb 6 */}
          <div className="absolute top-[40%] left-[10%] w-56 h-56 bg-regal-purple rounded-full opacity-15 blur-2xl animate-float animation-delay-10000"></div>
          
          {/* Tiny floating particles */}
          <div className="absolute top-[15%] left-[60%] w-24 h-24 bg-sapphire-blue rounded-full opacity-10 blur-xl animate-float"></div>
          <div className="absolute bottom-[50%] left-[80%] w-32 h-32 bg-regal-purple rounded-full opacity-10 blur-xl animate-float animation-delay-3000"></div>
          <div className="absolute top-[80%] left-[40%] w-20 h-20 bg-sapphire-blue rounded-full opacity-10 blur-xl animate-float animation-delay-5000"></div>
        </div>
        
        {/* Grid overlay for professional look */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-midnight-navy/80 via-charcoal-gray/30 to-midnight-navy/60"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(224,225,221,0.03)_1px,transparent_1px),linear-gradient(to_right,rgba(224,225,221,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        </div>
      </div>
      
      {/* Header */}
      <div className="bg-charcoal-gray/70 backdrop-blur-xl border-b border-sapphire-blue/20 sticky top-0 z-40 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="flex items-center space-x-2 text-off-white hover:text-cool-gray transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Home</span>
              </button>
              <div className="h-6 w-px bg-sapphire-blue/30" />
              <div className="flex items-center space-x-3">
                <div className="bg-sapphire-blue/20 p-2 rounded-lg backdrop-blur-sm">
                  <Globe className="h-5 w-5 text-sapphire-blue" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-off-white">Select Your Jurisdiction</h1>
                  <p className="text-sm text-cool-gray">Choose your legal jurisdiction to continue</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-charcoal-gray/50 backdrop-blur-sm px-3 py-1 rounded-full border border-sapphire-blue/20">
                <span className="text-sm font-medium text-off-white">
                  Welcome, {user?.displayName || user?.email?.split('@')[0] || 'User'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sapphire-blue/20 backdrop-blur-sm rounded-full mb-6 animate-glow">
            <Scale className="h-8 w-8 text-off-white" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Select Your Legal
            <br />
            <span className="bg-gradient-to-r from-sapphire-blue to-regal-purple bg-clip-text text-transparent">Jurisdiction</span>
          </h1>
          
          <p className="text-xl text-cool-gray max-w-2xl mx-auto leading-relaxed">
            Choose your country to receive jurisdiction-specific legal guidance and analysis 
            tailored to your local laws and regulations.
          </p>
        </div>

        <div className="bg-charcoal-gray/70 backdrop-blur-xl rounded-xl shadow-sm border border-sapphire-blue/20 p-8">
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {countries.map((country) => (
              <button
                key={country.code}
                onClick={() => handleCountrySelect(country.code)}
                className={`flex items-center space-x-4 p-6 rounded-lg border transition-all text-left group ${
                  selectedCountry === country.code
                    ? 'border-sapphire-blue bg-sapphire-blue/20 shadow-lg'
                    : 'border-sapphire-blue/20 hover:border-sapphire-blue/40 hover:bg-charcoal-gray/50'
                }`}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <span className="text-3xl">{country.flag}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-off-white">{country.name}</h3>
                    <p className="text-sm text-cool-gray">{country.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {selectedCountry === country.code && (
                    <CheckCircle className="h-5 w-5 text-sapphire-blue" />
                  )}
                  <ChevronRight className="h-5 w-5 text-cool-gray group-hover:text-off-white group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))}
          </div>

          {selectedCountry && (
            <div className="bg-sapphire-blue/10 border border-sapphire-blue/20 rounded-lg p-6 mb-6 backdrop-blur-sm">
              <div className="flex items-start space-x-3">
                <Globe className="h-6 w-6 text-sapphire-blue mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-off-white mb-2">
                    Selected: {countries.find(c => c.code === selectedCountry)?.name}
                  </h4>
                  <p className="text-sm text-cool-gray">
                    You'll receive legal analysis and guidance specific to{' '}
                    {countries.find(c => c.code === selectedCountry)?.description}.
                    This ensures accuracy and relevance for your legal matters.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div className="text-sm text-cool-gray">
              <p>You can change your jurisdiction later in your account settings.</p>
            </div>
            
            <button
              onClick={handleContinue}
              disabled={!selectedCountry || isSubmitting}
              className="bg-sapphire-blue text-off-white px-8 py-3 rounded-lg hover:bg-sapphire-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-off-white"></div>
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
          <p className="text-sm text-cool-gray">
            <strong>Privacy Notice:</strong> Your jurisdiction selection is stored locally and used only 
            to provide relevant legal information. We do not share this information with third parties.
          </p>
        </div>
      </div>
    </div>
  );
}