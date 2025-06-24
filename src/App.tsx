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

// Clean new advanced smoke background
function SalcostaBackground() {
  return (
    <div className="salcosta-background">
      {/* Primary Volumetric Smoke Layers */}
      <div className="smoke-layer" style={{ '--rotation': '15deg', '--scale': '0.8', '--opacity': '0.7' } as React.CSSProperties}></div>
      <div className="smoke-layer" style={{ '--rotation': '-25deg', '--scale': '1.2', '--opacity': '0.5' } as React.CSSProperties}></div>
      <div className="smoke-layer" style={{ '--rotation': '35deg', '--scale': '0.9', '--opacity': '0.8' } as React.CSSProperties}></div>
      <div className="smoke-layer" style={{ '--rotation': '-18deg', '--scale': '1.1', '--opacity': '0.4' } as React.CSSProperties}></div>
      <div className="smoke-layer" style={{ '--rotation': '12deg', '--scale': '0.7', '--opacity': '0.9' } as React.CSSProperties}></div>
      <div className="smoke-layer" style={{ '--rotation': '-32deg', '--scale': '1.0', '--opacity': '0.6' } as React.CSSProperties}></div>
      
      {/* Secondary Smoke Wisps */}
      <div className="smoke-wisp" style={{ '--rotation': '25deg' } as React.CSSProperties}></div>
      <div className="smoke-wisp" style={{ '--rotation': '-35deg' } as React.CSSProperties}></div>
      <div className="smoke-wisp" style={{ '--rotation': '18deg' } as React.CSSProperties}></div>
      <div className="smoke-wisp" style={{ '--rotation': '-22deg' } as React.CSSProperties}></div>
      
      {/* Atmospheric Particles */}
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      
      {/* Subtle Grid Overlay */}
      <div className="grid-overlay"></div>
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
        <SalcostaBackground />
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 animate-pulse shadow-glow">
            <Scale className="h-8 w-8 text-black" />
          </div>
          <p className="text-white animate-fade-in text-enhanced-contrast">Completing authentication...</p>
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
      gradient: 'from-blue-500/20 to-purple-500/20'
    },
    {
      id: 'legal-questions',
      title: 'Legal Questions',
      description: 'Get expert guidance on specific legal situations with statutory references and next steps',
      icon: MessageSquare,
      features: ['Statutory References', 'Case Law Examples', 'Action Plans', 'Time-Sensitive Alerts'],
      number: '02',
      gradient: 'from-green-500/20 to-blue-500/20'
    },
    {
      id: 'general-guidance',
      title: 'General Guidance',
      description: 'Comprehensive legal advice for broader inquiries with jurisdiction-specific answers',
      icon: BookOpen,
      features: ['Plain Language', 'Step-by-Step Plans', 'Resource Links', 'Compliance Checklists'],
      number: '03',
      gradient: 'from-purple-500/20 to-pink-500/20'
    },
    {
      id: 'redaction-review',
      title: 'Redaction Review',
      description: 'Analyze documents with redacted sections and assess impact of missing information',
      icon: Shield,
      features: ['Visible Content Analysis', 'Impact Assessment', 'Limitation Notices', 'Risk Evaluation'],
      number: '04',
      gradient: 'from-orange-500/20 to-red-500/20'
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
        <SalcostaBackground />
        <div className="text-center animate-scale-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 animate-glow shadow-3d">
            <Scale className="h-8 w-8 text-black animate-pulse" />
          </div>
          <p className="text-white text-glow text-enhanced-contrast">Loading...</p>
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
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <SalcostaBackground />
      
      {/* Firebase Configuration Notice */}
      {!isConfigured && (
        <div className="bg-white text-black border-b border-gray-200 px-4 py-3 glass-strong animate-slide-in-left">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-black animate-pulse" />
              <p className="text-black text-sm">
                <strong>Demo Mode:</strong> Configure Firebase to enable user authentication with email, phone, and Google sign-in.
              </p>
            </div>
            <button
              onClick={() => window.open('https://console.firebase.google.com/', '_blank')}
              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-all text-sm font-medium hover-lift"
            >
              Configure Firebase
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass backdrop-blur-xl border-b border-white/10 content-layer">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3 animate-slide-in-left text-enhanced-contrast">
              <div className="bg-white p-2 rounded-lg shadow-3d hover-tilt icon-3d">
                <Scale className="h-6 w-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white text-glow text-enhanced-contrast">Legal AI Advisor</h1>
                <p className="text-xs text-gray-400">Professional Legal Advisory</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8 animate-fade-in">
              <a href="#services" className="text-white hover:text-gray-300 transition-all text-sm font-medium hover-glow">Services</a>
              <a href="#about" className="text-white hover:text-gray-300 transition-all text-sm font-medium hover-glow">About</a>
              <a href="#contact" className="text-white hover:text-gray-300 transition-all text-sm font-medium hover-glow">Contact</a>
            </nav>

            <div className="flex items-center space-x-4 animate-slide-in-right">
              {selectedCountry && user && (
                <div className="hidden md:flex items-center space-x-2 glass px-3 py-1 rounded-full border border-white/20 shadow-glow">
                  <Globe className="h-4 w-4 text-white animate-float" />
                  <span className="text-sm font-medium text-white">
                    {countries.find(c => c.code === selectedCountry)?.name}
                  </span>
                </div>
              )}
              
              {user && isConfigured ? (
                <div className="hidden md:flex items-center space-x-3">
                  <button
                    onClick={() => setShowUserProfile(true)}
                    className="flex items-center space-x-2 glass hover:bg-white/20 px-3 py-2 rounded-lg transition-all border border-white/20 hover-lift"
                  >
                    <User className="h-4 w-4 text-white" />
                    <span className="text-sm font-medium text-white">
                      {profile?.displayName || user.email?.split('@')[0] || 'User'}
                    </span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 text-white hover:text-gray-300 px-3 py-2 rounded-lg hover:bg-white/10 transition-all hover-glow"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center space-x-3">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="text-white hover:text-gray-300 px-3 py-2 rounded-lg hover:bg-white/10 transition-all font-medium hover-glow"
                    disabled={!isConfigured}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuthModal('signup')}
                    className="btn-primary shadow-3d-hover"
                    disabled={!isConfigured}
                  >
                    Sign Up
                  </button>
                </div>
              )}
              
              <button
                onClick={handleCountrySelect}
                className="btn-primary shadow-3d-hover"
              >
                {selectedCountry ? 'Change Jurisdiction' : 'Select Country'}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-white hover:text-gray-300 transition-all hover-glow"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-strong backdrop-blur-xl border-t border-white/10 animate-slide-in-left">
            <div className="px-6 py-4 space-y-4">
              <a href="#services" className="block text-white hover:text-gray-300 transition-all text-sm font-medium hover-glow">Services</a>
              <a href="#about" className="block text-white hover:text-gray-300 transition-all text-sm font-medium hover-glow">About</a>
              <a href="#contact" className="block text-white hover:text-gray-300 transition-all text-sm font-medium hover-glow">Contact</a>
              
              {user && isConfigured ? (
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <button
                    onClick={() => setShowUserProfile(true)}
                    className="block w-full text-left text-white hover:text-gray-300 transition-all text-sm hover-glow"
                  >
                    Profile
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left text-white hover:text-gray-300 transition-all text-sm hover-glow"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="block w-full text-left text-white hover:text-gray-300 transition-all text-sm hover-glow"
                    disabled={!isConfigured}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuthModal('signup')}
                    className="block w-full text-left text-white hover:text-gray-300 transition-all text-sm hover-glow"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-strong text-white rounded-xl shadow-3d max-w-md w-full p-6 transform transition-all animate-scale-in">
            <h2 className="text-xl font-bold text-white mb-4 text-glow">Select Legal Jurisdiction</h2>
            <p className="text-gray-300 mb-6">Choose your country to receive jurisdiction-specific legal guidance and analysis.</p>
            <div className="grid grid-cols-1 gap-3">
              {countries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => {
                    setSelectedCountry(country.code);
                    setShowCountryModal(false);
                  }}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-white/20 hover:border-white/40 hover:bg-white/10 transition-all text-left group interactive-card"
                >
                  <span className="text-2xl animate-float">{country.flag}</span>
                  <span className="font-medium text-white">{country.name}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400 ml-auto group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCountryModal(false)}
              className="mt-4 w-full py-2 text-gray-400 hover:text-white transition-all hover-glow"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <main className="pt-20 relative">
        {!selectedCountry || !user ? (
          <>
            {/* Hero Section */}
            <section className="min-h-screen flex items-center justify-center px-6 lg:px-8 relative perspective-1000 content-layer">
              <div className="max-w-4xl mx-auto text-center animate-fade-in-up">
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-8 shadow-3d hover-tilt animate-glow">
                    <Scale className="h-10 w-10 text-black icon-float" />
                  </div>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-3d text-enhanced-contrast">
                  Professional
                  <br />
                  <span className="gradient-text-animated">Legal AI</span>
                  <br />
                  Advisory
                </h1>
                
                <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed animate-slide-in-left text-enhanced-contrast">
                  Advanced AI-powered legal analysis calibrated to your jurisdiction's legal framework. 
                  Get comprehensive document reviews, expert guidance, and statutory citations.
                </p>
                
                {!user && isConfigured && (
                  <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-12 animate-slide-in-right">
                    <button
                      onClick={() => openAuthModal('signup')}
                      className="btn-primary shadow-3d-hover group"
                    >
                      Get Started Free
                      <ArrowRight className="inline-block ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                      onClick={() => openAuthModal('login')}
                      className="btn-secondary shadow-3d-hover"
                    >
                      Sign In
                    </button>
                  </div>
                )}
                
                <button
                  onClick={handleCountrySelect}
                  className="btn-primary shadow-3d-hover group animate-scale-in"
                >
                  Select Your Jurisdiction
                  <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </section>

            {/* Services Section */}
            <section id="services" className="py-32 px-6 lg:px-8 relative content-layer">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-20 animate-fade-in-up text-enhanced-contrast">
                  <h2 className="text-4xl md:text-6xl font-bold mb-6 text-3d text-enhanced-contrast">
                    Legal Advisory
                    <br />
                    <span className="gradient-text">Services</span>
                  </h2>
                  <p className="text-xl text-gray-400 max-w-2xl mx-auto text-enhanced-contrast">
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
                        className="group cursor-pointer animate-slide-in-left"
                        style={{ animationDelay: `${index * 0.1}s` }}
                        onClick={() => handleServiceSelect(service.id)}
                      >
                        <div className={`interactive-card glass border border-white/10 rounded-xl p-8 hover:border-white/30 transition-all duration-500 bg-gradient-to-br ${service.gradient} relative overflow-hidden`}>
                          {/* Animated background gradient */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          
                          <div className="flex items-start justify-between mb-6 relative z-10">
                            <div className="flex items-center space-x-4">
                              <span className="text-6xl font-bold text-gray-600 text-3d">{service.number}</span>
                              <div className="glass p-3 rounded-lg shadow-3d hover-tilt">
                                <IconComponent className="h-6 w-6 text-white icon-float" />
                              </div>
                            </div>
                            <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                          </div>
                          
                          <h3 className="text-2xl font-bold text-white mb-4 text-glow">{service.title}</h3>
                          <p className="text-gray-400 mb-6 leading-relaxed">{service.description}</p>
                          
                          <div className="space-y-2">
                            {service.features.map((feature, featureIndex) => (
                              <div key={featureIndex} className="flex items-center text-sm text-gray-300 animate-slide-in-left" style={{ animationDelay: `${(index * 0.1) + (featureIndex * 0.05)}s` }}>
                                <CheckCircle className="h-4 w-4 text-white mr-3 flex-shrink-0 animate-pulse" />
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
            <section id="about" className="py-32 px-6 lg:px-8 border-t border-white/10 relative content-layer">
              <div className="max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                  <div className="animate-slide-in-left text-enhanced-contrast">
                    <h2 className="text-4xl md:text-6xl font-bold mb-8 text-3d text-enhanced-contrast">
                      Why Choose
                      <br />
                      <span className="gradient-text">LegalAI Pro</span>
                    </h2>
                    <p className="text-xl text-gray-400 mb-12 leading-relaxed text-enhanced-contrast">
                      Our advanced AI platform provides comprehensive legal analysis with 
                      jurisdiction-specific insights, ensuring accuracy and relevance for your legal matters.
                    </p>
                  </div>
                  
                  <div className="space-y-8 animate-slide-in-right">
                    <div className="flex items-start space-x-4 interactive-card glass p-4 rounded-lg">
                      <div className="glass-strong p-3 rounded-lg flex-shrink-0 shadow-3d hover-tilt">
                        <Shield className="h-6 w-6 text-white icon-float" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2 text-glow">Secure & Confidential</h3>
                        <p className="text-gray-400">End-to-end encryption with automatic document purging after analysis.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4 interactive-card glass p-4 rounded-lg">
                      <div className="glass-strong p-3 rounded-lg flex-shrink-0 shadow-3d hover-tilt">
                        <Zap className="h-6 w-6 text-white icon-float" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2 text-glow">Instant Analysis</h3>
                        <p className="text-gray-400">AI-powered review delivers comprehensive results in seconds, not hours.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4 interactive-card glass p-4 rounded-lg">
                      <div className="glass-strong p-3 rounded-lg flex-shrink-0 shadow-3d hover-tilt">
                        <Target className="h-6 w-6 text-white icon-float" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2 text-glow">Expert Knowledge</h3>
                        <p className="text-gray-400">Trained on comprehensive legal databases with current statutory references.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-32 px-6 lg:px-8 border-t border-white/10 relative content-layer">
              <div className="max-w-4xl mx-auto text-center animate-fade-in-up">
                <h2 className="text-4xl md:text-6xl font-bold mb-8 text-3d text-enhanced-contrast">
                  Ready to Get
                  <br />
                  <span className="gradient-text">Started?</span>
                </h2>
                <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto text-enhanced-contrast">
                  Join thousands of legal professionals who trust LegalAI Pro for their document analysis and legal guidance needs.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                  {!user && isConfigured && (
                    <button
                      onClick={() => openAuthModal('signup')}
                      className="btn-primary shadow-3d-hover group"
                    >
                      Start Free Trial
                      <ArrowRight className="inline-block ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      <Sparkles className="inline-block ml-1 h-4 w-4 animate-pulse" />
                    </button>
                  )}
                  
                  <button
                    onClick={handleCountrySelect}
                    className="btn-secondary shadow-3d-hover"
                  >
                    Select Jurisdiction
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : (
          /* Services Dashboard */
          <section className="min-h-screen py-32 px-6 lg:px-8 relative content-layer">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-20 animate-fade-in-up text-enhanced-contrast">
                <h1 className="text-4xl md:text-6xl font-bold mb-6 text-3d text-enhanced-contrast">
                  Legal Advisory
                  <br />
                  <span className="gradient-text">Services</span>
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto text-enhanced-contrast">
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
                      className="group cursor-pointer animate-slide-in-left"
                      style={{ animationDelay: `${index * 0.1}s` }}
                      onClick={() => handleServiceSelect(service.id)}
                    >
                      <div className={`interactive-card glass border border-white/10 rounded-xl p-8 hover:border-white/30 transition-all duration-500 bg-gradient-to-br ${service.gradient} relative overflow-hidden`}>
                        {/* Animated background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="flex items-start justify-between mb-6 relative z-10">
                          <div className="flex items-center space-x-4">
                            <span className="text-6xl font-bold text-gray-600 text-3d">{service.number}</span>
                            <div className="glass p-3 rounded-lg shadow-3d hover-tilt">
                              <IconComponent className="h-6 w-6 text-white icon-float" />
                            </div>
                          </div>
                          <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
                        
                        <h3 className="text-2xl font-bold text-white mb-4 text-glow">{service.title}</h3>
                        <p className="text-gray-400 mb-6 leading-relaxed">{service.description}</p>
                        
                        <div className="space-y-2">
                          {service.features.map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex items-center text-sm text-gray-300 animate-slide-in-left" style={{ animationDelay: `${(index * 0.1) + (featureIndex * 0.05)}s` }}>
                              <CheckCircle className="h-4 w-4 text-white mr-3 flex-shrink-0 animate-pulse" />
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
      <footer className="border-t border-white/10 py-16 px-6 lg:px-8 relative content-layer">
        <div className="max-w-7xl mx-auto">
          <div className="text-center animate-fade-in-up text-enhanced-contrast">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Scale className="h-6 w-6 text-white icon-float" />
              <span className="text-xl font-bold text-white text-glow text-enhanced-contrast">Legal AI Advisor</span>
            </div>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto text-enhanced-contrast">
              Professional legal advisory powered by advanced AI. This platform provides general legal information 
              and should not be considered as legal advice. Always consult with a qualified attorney for specific legal matters.
            </p>
            <div className="flex flex-wrap justify-center items-center space-x-6 text-sm text-gray-400 text-enhanced-contrast">
              <span>© 2025 LegalAI Pro</span>
              <span>•</span>
              <span className="hover:text-white transition-colors hover-glow cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-white transition-colors hover-glow cursor-pointer">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-white transition-colors hover-glow cursor-pointer">Contact Support</span>
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