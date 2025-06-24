import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Scale, Upload, MessageSquare, FileText, Shield, BookOpen, ChevronRight, Globe, Clock, CheckCircle, User, LogOut, AlertCircle, Menu, X, ArrowRight, Star, Zap, Target, Sparkles } from 'lucide-react';
import { FirebaseAuthProvider, useFirebaseAuth } from './contexts/FirebaseAuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { AIAuthModal } from './components/auth/AIAuthModal';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { UserProfile } from './components/profile/UserProfile';
import { useAuthGuard } from './hooks/useAuthGuard';
import { useSmoothScroll } from './hooks/useScrollPosition';
import { DocumentAnalysisPage } from './pages/DocumentAnalysisPage';
import { LegalQuestionsPage } from './pages/LegalQuestionsPage';
import { GeneralGuidancePage } from './pages/GeneralGuidancePage';
import { RedactionReviewPage } from './pages/RedactionReviewPage';

// Professional legal background component
function LegalBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Base navy background */}
      <div className="absolute inset-0 bg-[#0D1B2A]"></div>
      
      {/* Animated judicial purple elements */}
      <div className="absolute inset-0">
        {/* Large judicial element 1 */}
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-[#5E4B8B] rounded-full opacity-20 blur-3xl animate-blob"></div>
        
        {/* Large judicial element 2 */}
        <div className="absolute top-[20%] right-[-10%] w-80 h-80 bg-[#5E4B8B] rounded-full opacity-15 blur-3xl animate-blob animation-delay-2000"></div>
        
        {/* Medium element 3 */}
        <div className="absolute bottom-[10%] left-[20%] w-64 h-64 bg-[#5E4B8B] rounded-full opacity-12 blur-3xl animate-blob animation-delay-4000"></div>
        
        {/* Medium element 4 */}
        <div className="absolute top-[60%] right-[30%] w-72 h-72 bg-[#5E4B8B] rounded-full opacity-10 blur-3xl animate-blob animation-delay-6000"></div>
        
        {/* Small element 5 */}
        <div className="absolute bottom-[30%] right-[10%] w-48 h-48 bg-[#5E4B8B] rounded-full opacity-8 blur-2xl animate-blob animation-delay-8000"></div>
        
        {/* Small element 6 */}
        <div className="absolute top-[40%] left-[10%] w-56 h-56 bg-[#5E4B8B] rounded-full opacity-10 blur-2xl animate-blob animation-delay-10000"></div>
        
        {/* Tiny floating elements */}
        <div className="absolute top-[15%] left-[60%] w-24 h-24 bg-[#5E4B8B] rounded-full opacity-6 blur-xl animate-float"></div>
        <div className="absolute bottom-[50%] left-[80%] w-32 h-32 bg-[#5E4B8B] rounded-full opacity-5 blur-xl animate-float animation-delay-3000"></div>
        <div className="absolute top-[80%] left-[40%] w-20 h-20 bg-[#5E4B8B] rounded-full opacity-7 blur-xl animate-float animation-delay-5000"></div>
      </div>
      
      {/* Subtle overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0D1B2A]/80 via-transparent to-[#0D1B2A]/60"></div>
    </div>
  );
}

// Auth callback component
function AuthCallback() {
  const navigate = useNavigate();
  const { user, loading } = useFirebaseAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate('/', { replace: true });
      } else {
        navigate('/?auth=failed', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <LegalBackground />
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#5E4B8B]/20 backdrop-blur-sm rounded-full mb-4 animate-pulse border border-[#5E4B8B]/30">
            <Scale className="h-8 w-8 text-[#E0E1DD]" />
          </div>
          <p className="text-[#E0E1DD]">Completing authentication...</p>
        </div>
      </div>
    );
  }

  return null;
}

function AppContent() {
  const { user, profile, signOut, loading, isConfigured } = useFirebaseAuth();
  const { requireAuth, showAuthModal, authFeature, closeAuthModal } = useAuthGuard();
  const [selectedCountry, setSelectedCountry] = useState('');
  const [currentPage, setCurrentPage] = useState<'main' | 'document-analysis' | 'legal-questions' | 'general-guidance' | 'redaction-review'>('main');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showRegularAuthModal, setShowRegularAuthModal] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  const { scrollToTop } = useSmoothScroll();

  // Handle auth failure from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('auth') === 'failed') {
      setShowRegularAuthModal(true);
      setAuthMode('login');
      navigate('/', { replace: true });
    }
  }, [location, navigate]);

  // Restore user state from session
  useEffect(() => {
    const savedCountry = localStorage.getItem('selectedCountry');
    if (savedCountry && user) {
      setSelectedCountry(savedCountry);
    }
  }, [user]);

  // Save country selection
  useEffect(() => {
    if (selectedCountry && user) {
      localStorage.setItem('selectedCountry', selectedCountry);
    }
  }, [selectedCountry, user]);

  // Handle page transitions
  useEffect(() => {
    if (currentPage !== 'main') {
      scrollToTop(false);
    }
  }, [currentPage, scrollToTop]);

  const countries = [
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
  ];

  const services = [
    {
      id: 'document-analysis',
      title: 'Document Analysis',
      description: 'Upload contracts and legal documents for comprehensive risk assessment and clause analysis',
      icon: FileText,
      features: ['Risk Assessment', 'Clause Analysis', 'Missing Protections', 'Ambiguous Language'],
      number: '01',
      gradient: 'from-[#3366CC]/20 to-[#5E4B8B]/20'
    },
    {
      id: 'legal-questions',
      title: 'Legal Questions',
      description: 'Get expert guidance on specific legal situations with statutory references and next steps',
      icon: MessageSquare,
      features: ['Statutory References', 'Case Law Examples', 'Action Plans', 'Time-Sensitive Alerts'],
      number: '02',
      gradient: 'from-[#2ECC71]/20 to-[#3366CC]/20'
    },
    {
      id: 'general-guidance',
      title: 'General Guidance',
      description: 'Comprehensive legal advice for broader inquiries with jurisdiction-specific answers',
      icon: BookOpen,
      features: ['Plain Language', 'Step-by-Step Plans', 'Resource Links', 'Compliance Checklists'],
      number: '03',
      gradient: 'from-[#5E4B8B]/20 to-[#8A2BE2]/20'
    },
    {
      id: 'redaction-review',
      title: 'Redaction Review',
      description: 'Analyze documents with redacted sections and assess impact of missing information',
      icon: Shield,
      features: ['Visible Content Analysis', 'Impact Assessment', 'Limitation Notices', 'Risk Evaluation'],
      number: '04',
      gradient: 'from-[#B00020]/20 to-[#5E4B8B]/20'
    }
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      setSelectedCountry('');
      setCurrentPage('main');
      localStorage.removeItem('selectedCountry');
      navigate('/', { replace: true });
      scrollToTop(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const openAuthModal = (mode: 'login' | 'signup') => {
    if (!isConfigured) {
      alert('Please configure Firebase first by adding your Firebase credentials to the .env file.');
      return;
    }
    setAuthMode(mode);
    setShowRegularAuthModal(true);
  };

  const handleServiceSelect = async (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    const canAccess = await requireAuth(service?.title || 'AI analysis');
    
    if (canAccess) {
      setCurrentPage(serviceId as any);
    }
  };

  const handleCountrySelect = async () => {
    const canAccess = await requireAuth('jurisdiction selection');
    
    if (canAccess) {
      setShowCountryModal(true);
    }
  };

  const handleBackToMain = () => {
    setCurrentPage('main');
  };

  const closeRegularAuthModal = () => {
    setShowRegularAuthModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <LegalBackground />
        <div className="relative z-10 text-center animate-scale-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#5E4B8B]/20 backdrop-blur-sm rounded-full mb-4 animate-glow border border-[#5E4B8B]/30">
            <Scale className="h-8 w-8 text-[#E0E1DD] animate-pulse" />
          </div>
          <p className="text-[#E0E1DD]">Loading...</p>
        </div>
      </div>
    );
  }

  // Render specific service pages
  if (currentPage !== 'main' && user && selectedCountry) {
    const selectedCountryName = countries.find(c => c.code === selectedCountry)?.name || selectedCountry;
    
    switch (currentPage) {
      case 'document-analysis':
        return <DocumentAnalysisPage onBack={handleBackToMain} country={selectedCountryName} />;
      case 'legal-questions':
        return <LegalQuestionsPage onBack={handleBackToMain} country={selectedCountryName} />;
      case 'general-guidance':
        return <GeneralGuidancePage onBack={handleBackToMain} country={selectedCountryName} />;
      case 'redaction-review':
        return <RedactionReviewPage onBack={handleBackToMain} country={selectedCountryName} />;
    }
  }

  return (
    <div className="min-h-screen relative text-[#E0E1DD] overflow-hidden">
      <LegalBackground />
      
      {/* Firebase Configuration Notice */}
      {!isConfigured && (
        <div className="relative z-20 bg-[#5E4B8B]/20 backdrop-blur-sm border-b border-[#5E4B8B]/30 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-[#E0E1DD] animate-pulse" />
              <p className="text-[#E0E1DD] text-sm">
                <strong>Demo Mode:</strong> Configure Firebase to enable user authentication with email, phone, and Google sign-in.
              </p>
            </div>
            <button
              onClick={() => window.open('https://console.firebase.google.com/', '_blank')}
              className="bg-[#3366CC] text-[#E0E1DD] px-4 py-2 rounded-lg hover:bg-[#3366CC]/80 transition-all text-sm font-medium"
            >
              Configure Firebase
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative z-20 bg-[#0D1B2A]/80 backdrop-blur-xl border-b border-[#5E4B8B]/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3 animate-slide-in-left">
              <div className="bg-[#5E4B8B]/30 backdrop-blur-sm p-2 rounded-lg border border-[#5E4B8B]/40">
                <Scale className="h-6 w-6 text-[#E0E1DD]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#E0E1DD]">Legal AI Advisor</h1>
                <p className="text-xs text-[#A9A9B3]">Professional Legal Advisory</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8 animate-fade-in">
              <a href="#services" className="text-[#A9A9B3] hover:text-[#E0E1DD] transition-all text-sm font-medium">Services</a>
              <a href="#about" className="text-[#A9A9B3] hover:text-[#E0E1DD] transition-all text-sm font-medium">About</a>
              <a href="#contact" className="text-[#A9A9B3] hover:text-[#E0E1DD] transition-all text-sm font-medium">Contact</a>
            </nav>

            <div className="flex items-center space-x-4 animate-slide-in-right">
              {selectedCountry && user && (
                <div className="hidden md:flex items-center space-x-2 bg-[#5E4B8B]/20 backdrop-blur-sm px-3 py-1 rounded-full border border-[#5E4B8B]/30">
                  <Globe className="h-4 w-4 text-[#E0E1DD]" />
                  <span className="text-sm font-medium text-[#E0E1DD]">
                    {countries.find(c => c.code === selectedCountry)?.name}
                  </span>
                </div>
              )}
              
              {user && isConfigured ? (
                <div className="hidden md:flex items-center space-x-3">
                  <button
                    onClick={() => setShowUserProfile(true)}
                    className="flex items-center space-x-2 bg-[#5E4B8B]/20 backdrop-blur-sm hover:bg-[#5E4B8B]/30 px-3 py-2 rounded-lg transition-all border border-[#5E4B8B]/30"
                  >
                    <User className="h-4 w-4 text-[#E0E1DD]" />
                    <span className="text-sm font-medium text-[#E0E1DD]">
                      {profile?.displayName || user.email?.split('@')[0] || 'User'}
                    </span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 text-[#A9A9B3] hover:text-[#E0E1DD] px-3 py-2 rounded-lg hover:bg-[#5E4B8B]/10 transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center space-x-3">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="text-[#A9A9B3] hover:text-[#E0E1DD] px-3 py-2 rounded-lg hover:bg-[#5E4B8B]/10 transition-all font-medium"
                    disabled={!isConfigured}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuthModal('signup')}
                    className="bg-[#3366CC] text-[#E0E1DD] px-4 py-2 rounded-lg hover:bg-[#3366CC]/80 transition-all font-medium"
                    disabled={!isConfigured}
                  >
                    Sign Up
                  </button>
                </div>
              )}
              
              <button
                onClick={handleCountrySelect}
                className="bg-[#5E4B8B] text-[#E0E1DD] px-4 py-2 rounded-lg hover:bg-[#5E4B8B]/80 transition-all font-medium"
              >
                {selectedCountry ? 'Change Jurisdiction' : 'Select Country'}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-[#E0E1DD] hover:text-[#A9A9B3] transition-all"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0D1B2A]/90 backdrop-blur-xl border-t border-[#5E4B8B]/20">
            <div className="px-6 py-4 space-y-4">
              <a href="#services" className="block text-[#A9A9B3] hover:text-[#E0E1DD] transition-all text-sm font-medium">Services</a>
              <a href="#about" className="block text-[#A9A9B3] hover:text-[#E0E1DD] transition-all text-sm font-medium">About</a>
              <a href="#contact" className="block text-[#A9A9B3] hover:text-[#E0E1DD] transition-all text-sm font-medium">Contact</a>
              
              {user && isConfigured ? (
                <div className="pt-4 border-t border-[#5E4B8B]/20 space-y-2">
                  <button
                    onClick={() => setShowUserProfile(true)}
                    className="block w-full text-left text-[#A9A9B3] hover:text-[#E0E1DD] transition-all text-sm"
                  >
                    Profile
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left text-[#A9A9B3] hover:text-[#E0E1DD] transition-all text-sm"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-[#5E4B8B]/20 space-y-2">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="block w-full text-left text-[#A9A9B3] hover:text-[#E0E1DD] transition-all text-sm"
                    disabled={!isConfigured}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuthModal('signup')}
                    className="block w-full text-left text-[#A9A9B3] hover:text-[#E0E1DD] transition-all text-sm"
                    disabled={!isConfigured}
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Country Selection Modal */}
      {showCountryModal && user && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D1B2A]/90 backdrop-blur-xl text-[#E0E1DD] rounded-xl border border-[#5E4B8B]/30 max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-[#E0E1DD] mb-4">Select Legal Jurisdiction</h2>
            <p className="text-[#A9A9B3] mb-6">Choose your country to receive jurisdiction-specific legal guidance and analysis.</p>
            <div className="grid grid-cols-1 gap-3">
              {countries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => {
                    setSelectedCountry(country.code);
                    setShowCountryModal(false);
                  }}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-[#5E4B8B]/30 hover:border-[#5E4B8B]/50 hover:bg-[#5E4B8B]/10 transition-all text-left group"
                >
                  <span className="text-2xl">{country.flag}</span>
                  <span className="font-medium text-[#E0E1DD]">{country.name}</span>
                  <ChevronRight className="h-4 w-4 text-[#A9A9B3] ml-auto group-hover:text-[#E0E1DD] group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCountryModal(false)}
              className="mt-4 w-full py-2 text-[#A9A9B3] hover:text-[#E0E1DD] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <main className="relative z-10 pt-20">
        {!selectedCountry || !user ? (
          <>
            {/* Hero Section */}
            <section className="min-h-screen flex items-center justify-center px-6 lg:px-8 relative">
              <div className="max-w-4xl mx-auto text-center animate-fade-in-up">
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-[#5E4B8B]/20 backdrop-blur-sm rounded-full mb-8 animate-glow border border-[#5E4B8B]/30">
                    <Scale className="h-10 w-10 text-[#E0E1DD]" />
                  </div>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                  Professional
                  <br />
                  <span className="bg-gradient-to-r from-[#5E4B8B] to-[#8A2BE2] bg-clip-text text-transparent">Legal AI</span>
                  <br />
                  Advisory
                </h1>
                
                <p className="text-xl md:text-2xl text-[#A9A9B3] mb-12 max-w-3xl mx-auto leading-relaxed">
                  Advanced AI-powered legal analysis calibrated to your jurisdiction's legal framework. 
                  Get comprehensive document reviews, expert guidance, and statutory citations.
                </p>
                
                {!user && isConfigured && (
                  <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-12">
                    <button
                      onClick={() => openAuthModal('signup')}
                      className="bg-[#3366CC] text-[#E0E1DD] px-8 py-4 rounded-lg hover:bg-[#3366CC]/80 transition-all font-semibold group shadow-lg hover:shadow-[#3366CC]/25"
                    >
                      Get Started Free
                      <ArrowRight className="inline-block ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                      onClick={() => openAuthModal('login')}
                      className="bg-[#5E4B8B]/20 backdrop-blur-sm text-[#E0E1DD] px-8 py-4 rounded-lg hover:bg-[#5E4B8B]/30 transition-all font-semibold border border-[#5E4B8B]/30"
                    >
                      Sign In
                    </button>
                  </div>
                )}
                
                <button
                  onClick={handleCountrySelect}
                  className="bg-[#5E4B8B]/30 backdrop-blur-sm text-[#E0E1DD] px-8 py-4 rounded-lg hover:bg-[#5E4B8B]/40 transition-all font-semibold group border border-[#5E4B8B]/40"
                >
                  Select Your Jurisdiction
                  <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </section>

            {/* Services Section */}
            <section id="services" className="py-32 px-6 lg:px-8 relative">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-20">
                  <h2 className="text-4xl md:text-6xl font-bold mb-6">
                    Legal Advisory
                    <br />
                    <span className="bg-gradient-to-r from-[#5E4B8B] to-[#8A2BE2] bg-clip-text text-transparent">Services</span>
                  </h2>
                  <p className="text-xl text-[#A9A9B3] max-w-2xl mx-auto">
                    Specialized legal analysis based on your jurisdiction's legal framework. 
                    Choose the service that best fits your needs.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {services.map((service, index) => {
                    const IconComponent = service.icon;
                    return (
                      <div
                        key={service.id}
                        className="group cursor-pointer"
                        onClick={() => handleServiceSelect(service.id)}
                      >
                        <div className={`bg-[#0D1B2A]/40 backdrop-blur-xl border border-[#5E4B8B]/20 rounded-xl p-8 hover:border-[#5E4B8B]/40 transition-all duration-500 bg-gradient-to-br ${service.gradient} relative overflow-hidden hover:bg-[#5E4B8B]/10`}>
                          <div className="flex items-start justify-between mb-6 relative z-10">
                            <div className="flex items-center space-x-4">
                              <span className="text-6xl font-bold text-[#5E4B8B]/30">{service.number}</span>
                              <div className="bg-[#5E4B8B]/20 backdrop-blur-sm p-3 rounded-lg border border-[#5E4B8B]/30">
                                <IconComponent className="h-6 w-6 text-[#E0E1DD]" />
                              </div>
                            </div>
                            <ChevronRight className="h-6 w-6 text-[#A9A9B3] group-hover:text-[#E0E1DD] group-hover:translate-x-1 transition-all" />
                          </div>
                          
                          <h3 className="text-2xl font-bold text-[#E0E1DD] mb-4">{service.title}</h3>
                          <p className="text-[#A9A9B3] mb-6 leading-relaxed">{service.description}</p>
                          
                          <div className="space-y-2">
                            {service.features.map((feature, featureIndex) => (
                              <div key={featureIndex} className="flex items-center text-sm text-[#A9A9B3]">
                                <CheckCircle className="h-4 w-4 text-[#2ECC71] mr-3 flex-shrink-0" />
                                {feature}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Features Section */}
            <section id="about" className="py-32 px-6 lg:px-8 border-t border-[#5E4B8B]/20 relative">
              <div className="max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                  <div>
                    <h2 className="text-4xl md:text-6xl font-bold mb-8">
                      Why Choose
                      <br />
                      <span className="bg-gradient-to-r from-[#5E4B8B] to-[#8A2BE2] bg-clip-text text-transparent">LegalAI Pro</span>
                    </h2>
                    <p className="text-xl text-[#A9A9B3] mb-12 leading-relaxed">
                      Our advanced AI platform provides comprehensive legal analysis with 
                      jurisdiction-specific insights, ensuring accuracy and relevance for your legal matters.
                    </p>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="flex items-start space-x-4 bg-[#0D1B2A]/40 backdrop-blur-sm p-4 rounded-lg border border-[#5E4B8B]/20">
                      <div className="bg-[#5E4B8B]/20 backdrop-blur-sm p-3 rounded-lg flex-shrink-0 border border-[#5E4B8B]/30">
                        <Shield className="h-6 w-6 text-[#E0E1DD]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-[#E0E1DD] mb-2">Secure & Confidential</h3>
                        <p className="text-[#A9A9B3]">End-to-end encryption with automatic document purging after analysis.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4 bg-[#0D1B2A]/40 backdrop-blur-sm p-4 rounded-lg border border-[#5E4B8B]/20">
                      <div className="bg-[#5E4B8B]/20 backdrop-blur-sm p-3 rounded-lg flex-shrink-0 border border-[#5E4B8B]/30">
                        <Zap className="h-6 w-6 text-[#E0E1DD]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-[#E0E1DD] mb-2">Instant Analysis</h3>
                        <p className="text-[#A9A9B3]">AI-powered review delivers comprehensive results in seconds, not hours.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4 bg-[#0D1B2A]/40 backdrop-blur-sm p-4 rounded-lg border border-[#5E4B8B]/20">
                      <div className="bg-[#5E4B8B]/20 backdrop-blur-sm p-3 rounded-lg flex-shrink-0 border border-[#5E4B8B]/30">
                        <Target className="h-6 w-6 text-[#E0E1DD]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-[#E0E1DD] mb-2">Expert Knowledge</h3>
                        <p className="text-[#A9A9B3]">Trained on comprehensive legal databases with current statutory references.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-32 px-6 lg:px-8 border-t border-[#5E4B8B]/20 relative">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-4xl md:text-6xl font-bold mb-8">
                  Ready to Get
                  <br />
                  <span className="bg-gradient-to-r from-[#5E4B8B] to-[#8A2BE2] bg-clip-text text-transparent">Started?</span>
                </h2>
                <p className="text-xl text-[#A9A9B3] mb-12 max-w-2xl mx-auto">
                  Join thousands of legal professionals who trust LegalAI Pro for their document analysis and legal guidance needs.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                  {!user && isConfigured && (
                    <button
                      onClick={() => openAuthModal('signup')}
                      className="bg-[#3366CC] text-[#E0E1DD] px-8 py-4 rounded-lg hover:bg-[#3366CC]/80 transition-all font-semibold group shadow-lg hover:shadow-[#3366CC]/25"
                    >
                      Start Free Trial
                      <ArrowRight className="inline-block ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      <Sparkles className="inline-block ml-1 h-4 w-4 animate-pulse" />
                    </button>
                  )}
                  
                  <button
                    onClick={handleCountrySelect}
                    className="bg-[#5E4B8B]/20 backdrop-blur-sm text-[#E0E1DD] px-8 py-4 rounded-lg hover:bg-[#5E4B8B]/30 transition-all font-semibold border border-[#5E4B8B]/30"
                  >
                    Select Jurisdiction
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : (
          /* Services Dashboard */
          <section className="min-h-screen py-32 px-6 lg:px-8 relative">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-20">
                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                  Legal Advisory
                  <br />
                  <span className="bg-gradient-to-r from-[#5E4B8B] to-[#8A2BE2] bg-clip-text text-transparent">Services</span>
                </h1>
                <p className="text-xl text-[#A9A9B3] max-w-2xl mx-auto">
                  Specialized legal analysis based on {countries.find(c => c.code === selectedCountry)?.name} legal framework. 
                  Choose the service that best fits your needs.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {services.map((service, index) => {
                  const IconComponent = service.icon;
                  return (
                    <div
                      key={service.id}
                      className="group cursor-pointer"
                      onClick={() => handleServiceSelect(service.id)}
                    >
                      <div className={`bg-[#0D1B2A]/40 backdrop-blur-xl border border-[#5E4B8B]/20 rounded-xl p-8 hover:border-[#5E4B8B]/40 transition-all duration-500 bg-gradient-to-br ${service.gradient} relative overflow-hidden hover:bg-[#5E4B8B]/10`}>
                        <div className="flex items-start justify-between mb-6 relative z-10">
                          <div className="flex items-center space-x-4">
                            <span className="text-6xl font-bold text-[#5E4B8B]/30">{service.number}</span>
                            <div className="bg-[#5E4B8B]/20 backdrop-blur-sm p-3 rounded-lg border border-[#5E4B8B]/30">
                              <IconComponent className="h-6 w-6 text-[#E0E1DD]" />
                            </div>
                          </div>
                          <ChevronRight className="h-6 w-6 text-[#A9A9B3] group-hover:text-[#E0E1DD] group-hover:translate-x-1 transition-all" />
                        </div>
                        
                        <h3 className="text-2xl font-bold text-[#E0E1DD] mb-4">{service.title}</h3>
                        <p className="text-[#A9A9B3] mb-6 leading-relaxed">{service.description}</p>
                        
                        <div className="space-y-2">
                          {service.features.map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex items-center text-sm text-[#A9A9B3]">
                              <CheckCircle className="h-4 w-4 text-[#2ECC71] mr-3 flex-shrink-0" />
                              {feature}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#5E4B8B]/20 py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Scale className="h-6 w-6 text-[#E0E1DD]" />
              <span className="text-xl font-bold text-[#E0E1DD]">Legal AI Advisor</span>
            </div>
            <p className="text-[#A9A9B3] mb-8 max-w-2xl mx-auto">
              Professional legal advisory powered by advanced AI. This platform provides general legal information 
              and should not be considered as legal advice. Always consult with a qualified attorney for specific legal matters.
            </p>
            <div className="flex flex-wrap justify-center items-center space-x-6 text-sm text-[#A9A9B3]">
              <span>© 2025 LegalAI Pro</span>
              <span>•</span>
              <span className="hover:text-[#E0E1DD] transition-colors cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-[#E0E1DD] transition-colors cursor-pointer">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-[#E0E1DD] transition-colors cursor-pointer">Contact Support</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Hidden reCAPTCHA container for phone auth */}
      <div id="recaptcha-container"></div>

      {/* Modals */}
      {isConfigured && (
        <>
          <AuthModal
            isOpen={showRegularAuthModal}
            onClose={closeRegularAuthModal}
            initialMode={authMode}
          />
          
          <AIAuthModal
            isOpen={showAuthModal}
            onClose={closeAuthModal}
            feature={authFeature}
          />
          
          <UserProfile
            isOpen={showUserProfile}
            onClose={() => setShowUserProfile(false)}
          />
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <FirebaseAuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </Router>
    </FirebaseAuthProvider>
  );
}