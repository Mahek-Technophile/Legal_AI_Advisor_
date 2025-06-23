import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Scale, Upload, MessageSquare, FileText, Shield, BookOpen, ChevronRight, Globe, Clock, CheckCircle, User, LogOut, AlertCircle, Menu, X, ArrowRight, Star, Zap, Target } from 'lucide-react';
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

// Floating cursor component
function FloatingCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    const handleHoverStart = () => setIsHovering(true);
    const handleHoverEnd = () => setIsHovering(false);

    document.addEventListener('mousemove', updatePosition);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Add hover listeners to interactive elements
    const interactiveElements = document.querySelectorAll('button, a, [role="button"]');
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', handleHoverStart);
      el.addEventListener('mouseleave', handleHoverEnd);
    });

    return () => {
      document.removeEventListener('mousemove', updatePosition);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      interactiveElements.forEach(el => {
        el.removeEventListener('mouseenter', handleHoverStart);
        el.removeEventListener('mouseleave', handleHoverEnd);
      });
    };
  }, []);

  return (
    <div
      className={`fixed pointer-events-none z-50 transition-all duration-300 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${isHovering ? 'scale-150' : 'scale-100'}`}
      style={{
        left: position.x - 10,
        top: position.y - 10,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="w-5 h-5 bg-white rounded-full mix-blend-difference" />
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
            <Scale className="h-8 w-8 text-black animate-pulse" />
          </div>
          <p className="text-white">Completing authentication...</p>
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
      number: '01'
    },
    {
      id: 'legal-questions',
      title: 'Legal Questions',
      description: 'Get expert guidance on specific legal situations with statutory references and next steps',
      icon: MessageSquare,
      features: ['Statutory References', 'Case Law Examples', 'Action Plans', 'Time-Sensitive Alerts'],
      number: '02'
    },
    {
      id: 'general-guidance',
      title: 'General Guidance',
      description: 'Comprehensive legal advice for broader inquiries with jurisdiction-specific answers',
      icon: BookOpen,
      features: ['Plain Language', 'Step-by-Step Plans', 'Resource Links', 'Compliance Checklists'],
      number: '03'
    },
    {
      id: 'redaction-review',
      title: 'Redaction Review',
      description: 'Analyze documents with redacted sections and assess impact of missing information',
      icon: Shield,
      features: ['Visible Content Analysis', 'Impact Assessment', 'Limitation Notices', 'Risk Evaluation'],
      number: '04'
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
            <Scale className="h-8 w-8 text-black animate-pulse" />
          </div>
          <p className="text-white">Loading...</p>
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
    <div className="min-h-screen bg-black text-white">
      <FloatingCursor />
      
      {/* Firebase Configuration Notice */}
      {!isConfigured && (
        <div className="bg-white text-black border-b border-gray-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-black" />
              <p className="text-black text-sm">
                <strong>Demo Mode:</strong> Configure Firebase to enable user authentication with email, phone, and Google sign-in.
              </p>
            </div>
            <button
              onClick={() => window.open('https://console.firebase.google.com/', '_blank')}
              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Configure Firebase
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="bg-white p-2 rounded-lg">
                <Scale className="h-6 w-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">LegalAI Pro</h1>
                <p className="text-xs text-gray-400">Professional Legal Advisory</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#services" className="text-white hover:text-gray-300 transition-colors text-sm font-medium">Services</a>
              <a href="#about" className="text-white hover:text-gray-300 transition-colors text-sm font-medium">About</a>
              <a href="#contact" className="text-white hover:text-gray-300 transition-colors text-sm font-medium">Contact</a>
            </nav>

            <div className="flex items-center space-x-4">
              {selectedCountry && user && (
                <div className="hidden md:flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                  <Globe className="h-4 w-4 text-white" />
                  <span className="text-sm font-medium text-white">
                    {countries.find(c => c.code === selectedCountry)?.name}
                  </span>
                </div>
              )}
              
              {user && isConfigured ? (
                <div className="hidden md:flex items-center space-x-3">
                  <button
                    onClick={() => setShowUserProfile(true)}
                    className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-colors border border-white/20"
                  >
                    <User className="h-4 w-4 text-white" />
                    <span className="text-sm font-medium text-white">
                      {profile?.displayName || user.email?.split('@')[0] || 'User'}
                    </span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 text-white hover:text-gray-300 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center space-x-3">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="text-white hover:text-gray-300 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors font-medium"
                    disabled={!isConfigured}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuthModal('signup')}
                    className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                    disabled={!isConfigured}
                  >
                    Sign Up
                  </button>
                </div>
              )}
              
              <button
                onClick={handleCountrySelect}
                className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                {selectedCountry ? 'Change Jurisdiction' : 'Select Country'}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-white hover:text-gray-300 transition-colors"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-black/95 backdrop-blur-md border-t border-white/10">
            <div className="px-6 py-4 space-y-4">
              <a href="#services" className="block text-white hover:text-gray-300 transition-colors text-sm font-medium">Services</a>
              <a href="#about" className="block text-white hover:text-gray-300 transition-colors text-sm font-medium">About</a>
              <a href="#contact" className="block text-white hover:text-gray-300 transition-colors text-sm font-medium">Contact</a>
              
              {user && isConfigured ? (
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <button
                    onClick={() => setShowUserProfile(true)}
                    className="block w-full text-left text-white hover:text-gray-300 transition-colors text-sm"
                  >
                    Profile
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left text-white hover:text-gray-300 transition-colors text-sm"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="block w-full text-left text-white hover:text-gray-300 transition-colors text-sm"
                    disabled={!isConfigured}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuthModal('signup')}
                    className="block w-full text-left text-white hover:text-gray-300 transition-colors text-sm"
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
          <div className="bg-white text-black rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all">
            <h2 className="text-xl font-bold text-black mb-4">Select Legal Jurisdiction</h2>
            <p className="text-gray-600 mb-6">Choose your country to receive jurisdiction-specific legal guidance and analysis.</p>
            <div className="grid grid-cols-1 gap-3">
              {countries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => {
                    setSelectedCountry(country.code);
                    setShowCountryModal(false);
                  }}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left group"
                >
                  <span className="text-2xl">{country.flag}</span>
                  <span className="font-medium text-black">{country.name}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400 ml-auto group-hover:text-black transition-colors" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCountryModal(false)}
              className="mt-4 w-full py-2 text-gray-600 hover:text-black transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <main className="pt-20">
        {!selectedCountry || !user ? (
          <>
            {/* Hero Section */}
            <section className="min-h-screen flex items-center justify-center px-6 lg:px-8">
              <div className="max-w-4xl mx-auto text-center">
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-8">
                    <Scale className="h-10 w-10 text-black" />
                  </div>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                  Professional
                  <br />
                  <span className="text-gray-400">Legal AI</span>
                  <br />
                  Advisory
                </h1>
                
                <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
                  Advanced AI-powered legal analysis calibrated to your jurisdiction's legal framework. 
                  Get comprehensive document reviews, expert guidance, and statutory citations.
                </p>
                
                {!user && isConfigured && (
                  <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-12">
                    <button
                      onClick={() => openAuthModal('signup')}
                      className="bg-white text-black px-8 py-4 rounded-lg hover:bg-gray-200 transition-all font-semibold text-lg group"
                    >
                      Get Started Free
                      <ArrowRight className="inline-block ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                      onClick={() => openAuthModal('login')}
                      className="border border-white/20 text-white px-8 py-4 rounded-lg hover:bg-white/10 transition-all font-semibold text-lg"
                    >
                      Sign In
                    </button>
                  </div>
                )}
                
                <button
                  onClick={handleCountrySelect}
                  className="inline-flex items-center bg-white text-black px-8 py-4 rounded-lg hover:bg-gray-200 transition-all font-semibold text-lg group"
                >
                  Select Your Jurisdiction
                  <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </section>

            {/* Services Section */}
            <section id="services" className="py-32 px-6 lg:px-8">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-20">
                  <h2 className="text-4xl md:text-6xl font-bold mb-6">
                    Legal Advisory
                    <br />
                    <span className="text-gray-400">Services</span>
                  </h2>
                  <p className="text-xl text-gray-400 max-w-2xl mx-auto">
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
                        <div className="border border-white/10 rounded-xl p-8 hover:border-white/30 transition-all duration-500 hover:bg-white/5">
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center space-x-4">
                              <span className="text-6xl font-bold text-gray-600">{service.number}</span>
                              <div className="bg-white/10 p-3 rounded-lg">
                                <IconComponent className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                          </div>
                          
                          <h3 className="text-2xl font-bold text-white mb-4">{service.title}</h3>
                          <p className="text-gray-400 mb-6 leading-relaxed">{service.description}</p>
                          
                          <div className="space-y-2">
                            {service.features.map((feature, featureIndex) => (
                              <div key={featureIndex} className="flex items-center text-sm text-gray-300">
                                <CheckCircle className="h-4 w-4 text-white mr-3 flex-shrink-0" />
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
            <section id="about" className="py-32 px-6 lg:px-8 border-t border-white/10">
              <div className="max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                  <div>
                    <h2 className="text-4xl md:text-6xl font-bold mb-8">
                      Why Choose
                      <br />
                      <span className="text-gray-400">LegalAI Pro</span>
                    </h2>
                    <p className="text-xl text-gray-400 mb-12 leading-relaxed">
                      Our advanced AI platform provides comprehensive legal analysis with 
                      jurisdiction-specific insights, ensuring accuracy and relevance for your legal matters.
                    </p>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="flex items-start space-x-4">
                      <div className="bg-white/10 p-3 rounded-lg flex-shrink-0">
                        <Shield className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">Secure & Confidential</h3>
                        <p className="text-gray-400">End-to-end encryption with automatic document purging after analysis.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <div className="bg-white/10 p-3 rounded-lg flex-shrink-0">
                        <Zap className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">Instant Analysis</h3>
                        <p className="text-gray-400">AI-powered review delivers comprehensive results in seconds, not hours.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <div className="bg-white/10 p-3 rounded-lg flex-shrink-0">
                        <Target className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">Expert Knowledge</h3>
                        <p className="text-gray-400">Trained on comprehensive legal databases with current statutory references.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-32 px-6 lg:px-8 border-t border-white/10">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-4xl md:text-6xl font-bold mb-8">
                  Ready to Get
                  <br />
                  <span className="text-gray-400">Started?</span>
                </h2>
                <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                  Join thousands of legal professionals who trust LegalAI Pro for their document analysis and legal guidance needs.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                  {!user && isConfigured && (
                    <button
                      onClick={() => openAuthModal('signup')}
                      className="bg-white text-black px-8 py-4 rounded-lg hover:bg-gray-200 transition-all font-semibold text-lg group"
                    >
                      Start Free Trial
                      <ArrowRight className="inline-block ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                  
                  <button
                    onClick={handleCountrySelect}
                    className="border border-white/20 text-white px-8 py-4 rounded-lg hover:bg-white/10 transition-all font-semibold text-lg"
                  >
                    Select Jurisdiction
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : (
          /* Services Dashboard */
          <section className="min-h-screen py-32 px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-20">
                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                  Legal Advisory
                  <br />
                  <span className="text-gray-400">Services</span>
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
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
                      <div className="border border-white/10 rounded-xl p-8 hover:border-white/30 transition-all duration-500 hover:bg-white/5">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center space-x-4">
                            <span className="text-6xl font-bold text-gray-600">{service.number}</span>
                            <div className="bg-white/10 p-3 rounded-lg">
                              <IconComponent className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
                        
                        <h3 className="text-2xl font-bold text-white mb-4">{service.title}</h3>
                        <p className="text-gray-400 mb-6 leading-relaxed">{service.description}</p>
                        
                        <div className="space-y-2">
                          {service.features.map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex items-center text-sm text-gray-300">
                              <CheckCircle className="h-4 w-4 text-white mr-3 flex-shrink-0" />
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
      <footer className="border-t border-white/10 py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Scale className="h-6 w-6 text-white" />
              <span className="text-xl font-bold text-white">LegalAI Pro</span>
            </div>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Professional legal advisory powered by advanced AI. This platform provides general legal information 
              and should not be considered as legal advice. Always consult with a qualified attorney for specific legal matters.
            </p>
            <div className="flex flex-wrap justify-center items-center space-x-6 text-sm text-gray-400">
              <span>© 2025 LegalAI Pro</span>
              <span>•</span>
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
              <span>•</span>
              <span>Contact Support</span>
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

function App() {
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

export default App;