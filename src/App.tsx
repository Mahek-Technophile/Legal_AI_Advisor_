import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Scale, Upload, MessageSquare, FileText, Shield, ChevronRight, Globe, Clock, CheckCircle, User, LogOut, AlertCircle, Menu, X, ArrowRight, Star, Zap, Target, Sparkles, Search } from 'lucide-react';
import { FirebaseAuthProvider, useFirebaseAuth } from './contexts/FirebaseAuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { AIAuthModal } from './components/auth/AIAuthModal';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { UserProfile } from './components/profile/UserProfile';
import { ServicesDropdown } from './components/navigation/ServicesDropdown';
import { useAuthGuard } from './hooks/useAuthGuard';
import { useSmoothScroll } from './hooks/useScrollPosition';
import { DocumentAnalysisPage } from './pages/DocumentAnalysisPage';
import { LegalQuestionsPage } from './pages/LegalQuestionsPage';
import { RedactionReviewPage } from './pages/RedactionReviewPage';
import { ServicesPage } from './pages/ServicesPage';
import { JurisdictionSelectionPage } from './pages/JurisdictionSelectionPage';
import { DeepSearchPage } from './pages/DeepSearchPage';

// Background component
function LegalBackground() {
  return (
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
  );
}

// Auth callback component
function AuthCallback() {
  const navigate = useNavigate();
  const { user, loading } = useFirebaseAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate('/jurisdiction-selection', { replace: true });
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-charcoal-gray/50 backdrop-blur-sm rounded-full mb-4 animate-pulse">
            <Scale className="h-8 w-8 text-off-white" />
          </div>
          <p className="text-off-white">Completing authentication...</p>
        </div>
      </div>
    );
  }

  return null;
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useFirebaseAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <LegalBackground />
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-charcoal-gray/50 backdrop-blur-sm rounded-full mb-4 animate-pulse">
            <Scale className="h-8 w-8 text-off-white" />
          </div>
          <p className="text-off-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { user, profile, signOut, loading, isConfigured } = useFirebaseAuth();
  const { requireAuth, showAuthModal, authFeature, closeAuthModal } = useAuthGuard();
  const [selectedCountry, setSelectedCountry] = useState('');
  const [showRegularAuthModal, setShowRegularAuthModal] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  const { scrollToTop } = useSmoothScroll();

  // Handle auth failure from URL params and state-based auth modal opening
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const state = location.state as any;
    
    if (urlParams.get('auth') === 'failed') {
      setShowRegularAuthModal(true);
      setAuthMode('login');
      navigate('/', { replace: true });
    } else if (state?.openAuth) {
      setShowRegularAuthModal(true);
      setAuthMode('signup');
      // Clear the state to prevent reopening on refresh
      navigate(location.pathname, { replace: true, state: {} });
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

  const countries = [
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      setSelectedCountry('');
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

  const closeRegularAuthModal = () => {
    setShowRegularAuthModal(false);
  };

  // Handle logo click to go to home page
  const handleLogoClick = () => {
    navigate('/');
    scrollToTop(false);
  };

  const handleGetStarted = () => {
    if (user) {
      if (selectedCountry) {
        navigate('/services');
      } else {
        navigate('/jurisdiction-selection');
      }
    } else {
      openAuthModal('signup');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <LegalBackground />
        <div className="relative z-10 text-center animate-scale-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-charcoal-gray/50 backdrop-blur-sm rounded-full mb-4 animate-glow">
            <Scale className="h-8 w-8 text-off-white animate-pulse" />
          </div>
          <p className="text-off-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative text-off-white overflow-hidden">
      <LegalBackground />
      
      {/* Firebase Configuration Notice */}
      {!isConfigured && (
        <div className="relative z-20 bg-charcoal-gray/70 backdrop-blur-sm border-b border-sapphire-blue/20 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-off-white animate-pulse" />
              <p className="text-off-white text-sm">
                <strong>Demo Mode:</strong> Configure Firebase to enable user authentication with email, phone, and Google sign-in.
              </p>
            </div>
            <button
              onClick={() => window.open('https://console.firebase.google.com/', '_blank')}
              className="bg-sapphire-blue/20 backdrop-blur-sm text-off-white px-4 py-2 rounded-lg hover:bg-sapphire-blue/30 transition-all text-sm font-medium"
            >
              Configure Firebase
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative z-20 bg-midnight-navy/70 backdrop-blur-xl border-b border-sapphire-blue/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Clickable Logo */}
            <button 
              onClick={handleLogoClick}
              className="flex items-center space-x-3 animate-slide-in-left hover:opacity-80 transition-opacity"
            >
              <div className="bg-sapphire-blue/20 backdrop-blur-sm p-2 rounded-lg">
                <Scale className="h-6 w-6 text-off-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-off-white">Legal AI Advisor</h1>
                <p className="text-xs text-cool-gray">Professional Legal Advisory</p>
              </div>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8 animate-fade-in">
              <a href="#about" className="text-cool-gray hover:text-off-white transition-all text-sm font-medium">About</a>
              <ServicesDropdown />
              <a href="#contact" className="text-cool-gray hover:text-off-white transition-all text-sm font-medium">Contact</a>
            </nav>

            <div className="flex items-center space-x-4 animate-slide-in-right">
              {selectedCountry && user && (
                <div className="hidden md:flex items-center space-x-2 bg-charcoal-gray/50 backdrop-blur-sm px-3 py-1 rounded-full border border-sapphire-blue/20">
                  <Globe className="h-4 w-4 text-off-white" />
                  <span className="text-sm font-medium text-off-white">
                    {countries.find(c => c.code === selectedCountry)?.name}
                  </span>
                </div>
              )}
              
              {user && isConfigured ? (
                <div className="hidden md:flex items-center space-x-3">
                  <button
                    onClick={() => setShowUserProfile(true)}
                    className="flex items-center space-x-2 bg-charcoal-gray/50 backdrop-blur-sm hover:bg-charcoal-gray/70 px-3 py-2 rounded-lg transition-all border border-sapphire-blue/20"
                  >
                    <User className="h-4 w-4 text-off-white" />
                    <span className="text-sm font-medium text-off-white">
                      {profile?.displayName || user.email?.split('@')[0] || 'User'}
                    </span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 text-cool-gray hover:text-off-white px-3 py-2 rounded-lg hover:bg-charcoal-gray/50 transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center space-x-3">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="text-cool-gray hover:text-off-white px-3 py-2 rounded-lg hover:bg-charcoal-gray/50 transition-all font-medium"
                    disabled={!isConfigured}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuthModal('signup')}
                    className="bg-sapphire-blue text-off-white px-4 py-2 rounded-lg hover:bg-sapphire-blue/90 transition-all font-medium"
                    disabled={!isConfigured}
                  >
                    Sign Up
                  </button>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-off-white hover:text-cool-gray transition-all"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-charcoal-gray/70 backdrop-blur-xl border-t border-sapphire-blue/20">
            <div className="px-6 py-4 space-y-4">
              <a href="#about" className="block text-cool-gray hover:text-off-white transition-all text-sm font-medium">About</a>
              <button
                onClick={() => {
                  if (user && selectedCountry) {
                    navigate('/services');
                  } else if (user) {
                    navigate('/jurisdiction-selection');
                  } else {
                    openAuthModal('signup');
                  }
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left text-cool-gray hover:text-off-white transition-all text-sm font-medium"
              >
                Services
              </button>
              <a href="#contact" className="block text-cool-gray hover:text-off-white transition-all text-sm font-medium">Contact</a>
              
              {user && isConfigured ? (
                <div className="pt-4 border-t border-sapphire-blue/20 space-y-2">
                  <button
                    onClick={() => {
                      setShowUserProfile(true);
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left text-cool-gray hover:text-off-white transition-all text-sm"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left text-cool-gray hover:text-off-white transition-all text-sm"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-sapphire-blue/20 space-y-2">
                  <button
                    onClick={() => {
                      openAuthModal('login');
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left text-cool-gray hover:text-off-white transition-all text-sm"
                    disabled={!isConfigured}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      openAuthModal('signup');
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left text-cool-gray hover:text-off-white transition-all text-sm"
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

      <main className="relative z-10 pt-20">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center px-6 lg:px-8 relative">
          <div className="max-w-4xl mx-auto text-center animate-fade-in-up">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-sapphire-blue/20 backdrop-blur-sm rounded-full mb-8 animate-glow">
                <Scale className="h-10 w-10 text-off-white" />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Professional
              <br />
              <span className="bg-gradient-to-r from-sapphire-blue to-regal-purple bg-clip-text text-transparent">Legal AI</span>
              <br />
              Advisory
            </h1>
            
            <p className="text-xl md:text-2xl text-cool-gray mb-12 max-w-3xl mx-auto leading-relaxed">
              Advanced AI-powered legal analysis calibrated to your jurisdiction's legal framework. 
              Get comprehensive document reviews, expert guidance, and statutory citations.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-12">
              <button
                onClick={handleGetStarted}
                className="bg-sapphire-blue text-off-white px-8 py-4 rounded-lg hover:bg-sapphire-blue/90 transition-all font-semibold group"
              >
                Get Started
                <ArrowRight className="inline-block ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              {!user && isConfigured && (
                <button
                  onClick={() => openAuthModal('login')}
                  className="bg-charcoal-gray/50 backdrop-blur-sm text-off-white px-8 py-4 rounded-lg hover:bg-charcoal-gray/70 transition-all font-semibold border border-sapphire-blue/20"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="about" className="py-32 px-6 lg:px-8 border-t border-sapphire-blue/20 relative">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-4xl md:text-6xl font-bold mb-8">
                  Why Choose
                  <br />
                  <span className="bg-gradient-to-r from-sapphire-blue to-regal-purple bg-clip-text text-transparent">LegalAI Pro</span>
                </h2>
                <p className="text-xl text-cool-gray mb-12 leading-relaxed">
                  Our advanced AI platform provides comprehensive legal analysis with 
                  jurisdiction-specific insights, ensuring accuracy and relevance for your legal matters.
                </p>
              </div>
              
              <div className="space-y-8">
                <div className="flex items-start space-x-4 bg-charcoal-gray/50 backdrop-blur-sm p-4 rounded-lg border border-sapphire-blue/20">
                  <div className="bg-sapphire-blue/20 backdrop-blur-sm p-3 rounded-lg flex-shrink-0">
                    <Shield className="h-6 w-6 text-off-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-off-white mb-2">Secure & Confidential</h3>
                    <p className="text-cool-gray">End-to-end encryption with automatic document purging after analysis.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 bg-charcoal-gray/50 backdrop-blur-sm p-4 rounded-lg border border-sapphire-blue/20">
                  <div className="bg-sapphire-blue/20 backdrop-blur-sm p-3 rounded-lg flex-shrink-0">
                    <Zap className="h-6 w-6 text-off-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-off-white mb-2">Instant Analysis</h3>
                    <p className="text-cool-gray">AI-powered review delivers comprehensive results in seconds, not hours.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 bg-charcoal-gray/50 backdrop-blur-sm p-4 rounded-lg border border-sapphire-blue/20">
                  <div className="bg-sapphire-blue/20 backdrop-blur-sm p-3 rounded-lg flex-shrink-0">
                    <Target className="h-6 w-6 text-off-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-off-white mb-2">Expert Knowledge</h3>
                    <p className="text-cool-gray">Trained on comprehensive legal databases with current statutory references.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-32 px-6 lg:px-8 border-t border-sapphire-blue/20 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-8">
              Ready to Get
              <br />
              <span className="bg-gradient-to-r from-sapphire-blue to-regal-purple bg-clip-text text-transparent">Started?</span>
            </h2>
            <p className="text-xl text-cool-gray mb-12 max-w-2xl mx-auto">
              Join thousands of legal professionals who trust LegalAI Pro for their document analysis and legal guidance needs.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button
                onClick={handleGetStarted}
                className="bg-sapphire-blue text-off-white px-8 py-4 rounded-lg hover:bg-sapphire-blue/90 transition-all font-semibold group"
              >
                Start Free Trial
                <ArrowRight className="inline-block ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                <Sparkles className="inline-block ml-1 h-4 w-4 animate-pulse" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-sapphire-blue/20 py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Scale className="h-6 w-6 text-off-white" />
              <span className="text-xl font-bold text-off-white">Legal AI Advisor</span>
            </div>
            <p className="text-cool-gray mb-8 max-w-2xl mx-auto">
              Professional legal advisory powered by advanced AI. This platform provides general legal information 
              and should not be considered as legal advice. Always consult with a qualified attorney for specific legal matters.
            </p>
            <div className="flex flex-wrap justify-center items-center space-x-6 text-sm text-cool-gray">
              <span>© 2025 LegalAI Pro</span>
              <span>•</span>
              <span className="hover:text-off-white transition-colors cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-off-white transition-colors cursor-pointer">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-off-white transition-colors cursor-pointer">Contact Support</span>
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
          <Route 
            path="/jurisdiction-selection" 
            element={
              <ProtectedRoute>
                <JurisdictionSelectionPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/services" 
            element={
              <ProtectedRoute>
                <ServicesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/services/document-analysis" 
            element={
              <ProtectedRoute>
                <DocumentAnalysisPage onBack={() => window.history.back()} country="" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/services/legal-questions" 
            element={
              <ProtectedRoute>
                <LegalQuestionsPage onBack={() => window.history.back()} country="" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/services/redaction-review" 
            element={
              <ProtectedRoute>
                <RedactionReviewPage onBack={() => window.history.back()} country="" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/services/deepsearch" 
            element={
              <ProtectedRoute>
                <DeepSearchPage onBack={() => window.history.back()} country="" />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </FirebaseAuthProvider>
  );
}