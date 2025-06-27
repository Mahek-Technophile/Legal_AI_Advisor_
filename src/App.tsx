import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Scale, Upload, MessageSquare, FileText, Shield, ChevronRight, Globe, Clock, CheckCircle, User, LogOut, AlertCircle, Menu, X, ArrowRight, Star, Zap, Target, Sparkles } from 'lucide-react';
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

// Purple blob background component
function PurpleBlobBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Base dark background */}
      <div className="absolute inset-0 bg-gray-900"></div>
      
      {/* Animated purple blobs */}
      <div className="absolute inset-0">
        {/* Large blob 1 */}
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-purple-500 rounded-full opacity-80 blur-3xl animate-blob"></div>
        
        {/* Large blob 2 */}
        <div className="absolute top-[20%] right-[-10%] w-80 h-80 bg-purple-600 rounded-full opacity-70 blur-3xl animate-blob animation-delay-2000"></div>
        
        {/* Medium blob 3 */}
        <div className="absolute bottom-[10%] left-[20%] w-64 h-64 bg-purple-400 rounded-full opacity-60 blur-3xl animate-blob animation-delay-4000"></div>
        
        {/* Medium blob 4 */}
        <div className="absolute top-[60%] right-[30%] w-72 h-72 bg-purple-700 rounded-full opacity-50 blur-3xl animate-blob animation-delay-6000"></div>
        
        {/* Small blob 5 */}
        <div className="absolute bottom-[30%] right-[10%] w-48 h-48 bg-purple-500 rounded-full opacity-40 blur-2xl animate-blob animation-delay-8000"></div>
        
        {/* Small blob 6 */}
        <div className="absolute top-[40%] left-[10%] w-56 h-56 bg-purple-600 rounded-full opacity-45 blur-2xl animate-blob animation-delay-10000"></div>
        
        {/* Tiny floating blobs */}
        <div className="absolute top-[15%] left-[60%] w-24 h-24 bg-purple-400 rounded-full opacity-30 blur-xl animate-float"></div>
        <div className="absolute bottom-[50%] left-[80%] w-32 h-32 bg-purple-500 rounded-full opacity-25 blur-xl animate-float animation-delay-3000"></div>
        <div className="absolute top-[80%] left-[40%] w-20 h-20 bg-purple-600 rounded-full opacity-35 blur-xl animate-float animation-delay-5000"></div>
      </div>
      
      {/* Overlay gradient for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 via-transparent to-gray-900/30"></div>
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
        <PurpleBlobBackground />
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full mb-4 animate-pulse">
            <Scale className="h-8 w-8 text-white" />
          </div>
          <p className="text-white">Completing authentication...</p>
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
        <PurpleBlobBackground />
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full mb-4 animate-pulse">
            <Scale className="h-8 w-8 text-white" />
          </div>
          <p className="text-white">Loading...</p>
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
        <PurpleBlobBackground />
        <div className="relative z-10 text-center animate-scale-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full mb-4 animate-glow">
            <Scale className="h-8 w-8 text-white animate-pulse" />
          </div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative text-white overflow-hidden">
      <PurpleBlobBackground />
      
      {/* Firebase Configuration Notice */}
      {!isConfigured && (
        <div className="relative z-20 bg-white/10 backdrop-blur-sm border-b border-white/20 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-white animate-pulse" />
              <p className="text-white text-sm">
                <strong>Demo Mode:</strong> Configure Firebase to enable user authentication with email, phone, and Google sign-in.
              </p>
            </div>
            <button
              onClick={() => window.open('https://console.firebase.google.com/', '_blank')}
              className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all text-sm font-medium"
            >
              Configure Firebase
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative z-20 bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Clickable Logo */}
            <button 
              onClick={handleLogoClick}
              className="flex items-center space-x-3 animate-slide-in-left hover:opacity-80 transition-opacity"
            >
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <Scale className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Legal AI Advisor</h1>
                <p className="text-xs text-white/70">Professional Legal Advisory</p>
              </div>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8 animate-fade-in">
              <a href="#about" className="text-white/80 hover:text-white transition-all text-sm font-medium">About</a>
              <ServicesDropdown />
              <a href="#contact" className="text-white/80 hover:text-white transition-all text-sm font-medium">Contact</a>
            </nav>

            <div className="flex items-center space-x-4 animate-slide-in-right">
              {selectedCountry && user && (
                <div className="hidden md:flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
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
                    className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 px-3 py-2 rounded-lg transition-all border border-white/20"
                  >
                    <User className="h-4 w-4 text-white" />
                    <span className="text-sm font-medium text-white">
                      {profile?.displayName || user.email?.split('@')[0] || 'User'}
                    </span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center space-x-3">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-all font-medium"
                    disabled={!isConfigured}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuthModal('signup')}
                    className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all font-medium"
                    disabled={!isConfigured}
                  >
                    Sign Up
                  </button>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-white hover:text-white/80 transition-all"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/10 backdrop-blur-xl border-t border-white/10">
            <div className="px-6 py-4 space-y-4">
              <a href="#about" className="block text-white/80 hover:text-white transition-all text-sm font-medium">About</a>
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
                className="block w-full text-left text-white/80 hover:text-white transition-all text-sm font-medium"
              >
                Services
              </button>
              <a href="#contact" className="block text-white/80 hover:text-white transition-all text-sm font-medium">Contact</a>
              
              {user && isConfigured ? (
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <button
                    onClick={() => {
                      setShowUserProfile(true);
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left text-white/80 hover:text-white transition-all text-sm"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left text-white/80 hover:text-white transition-all text-sm"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <button
                    onClick={() => {
                      openAuthModal('login');
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left text-white/80 hover:text-white transition-all text-sm"
                    disabled={!isConfigured}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      openAuthModal('signup');
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left text-white/80 hover:text-white transition-all text-sm"
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
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-8 animate-glow">
                <Scale className="h-10 w-10 text-white" />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Professional
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Legal AI</span>
              <br />
              Advisory
            </h1>
            
            <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
              Advanced AI-powered legal analysis calibrated to your jurisdiction's legal framework. 
              Get comprehensive document reviews, expert guidance, and statutory citations.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-12">
              <button
                onClick={handleGetStarted}
                className="bg-purple-500/80 backdrop-blur-sm text-white px-8 py-4 rounded-lg hover:bg-purple-600/80 transition-all font-semibold group"
              >
                Get Started
                <ArrowRight className="inline-block ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              {!user && isConfigured && (
                <button
                  onClick={() => openAuthModal('login')}
                  className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-lg hover:bg-white/20 transition-all font-semibold border border-white/20"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="about" className="py-32 px-6 lg:px-8 border-t border-white/10 relative">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-4xl md:text-6xl font-bold mb-8">
                  Why Choose
                  <br />
                  <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">LegalAI Pro</span>
                </h2>
                <p className="text-xl text-white/80 mb-12 leading-relaxed">
                  Our advanced AI platform provides comprehensive legal analysis with 
                  jurisdiction-specific insights, ensuring accuracy and relevance for your legal matters.
                </p>
              </div>
              
              <div className="space-y-8">
                <div className="flex items-start space-x-4 bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                  <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg flex-shrink-0">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Secure & Confidential</h3>
                    <p className="text-white/70">End-to-end encryption with automatic document purging after analysis.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                  <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg flex-shrink-0">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Instant Analysis</h3>
                    <p className="text-white/70">AI-powered review delivers comprehensive results in seconds, not hours.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                  <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg flex-shrink-0">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Expert Knowledge</h3>
                    <p className="text-white/70">Trained on comprehensive legal databases with current statutory references.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-32 px-6 lg:px-8 border-t border-white/10 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-8">
              Ready to Get
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Started?</span>
            </h2>
            <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">
              Join thousands of legal professionals who trust LegalAI Pro for their document analysis and legal guidance needs.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button
                onClick={handleGetStarted}
                className="bg-purple-500/80 backdrop-blur-sm text-white px-8 py-4 rounded-lg hover:bg-purple-600/80 transition-all font-semibold group"
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
      <footer className="relative z-10 border-t border-white/10 py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Scale className="h-6 w-6 text-white" />
              <span className="text-xl font-bold text-white">Legal AI Advisor</span>
            </div>
            <p className="text-white/70 mb-8 max-w-2xl mx-auto">
              Professional legal advisory powered by advanced AI. This platform provides general legal information 
              and should not be considered as legal advice. Always consult with a qualified attorney for specific legal matters.
            </p>
            <div className="flex flex-wrap justify-center items-center space-x-6 text-sm text-white/60">
              <span>© 2025 LegalAI Pro</span>
              <span>•</span>
              <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-white transition-colors cursor-pointer">Contact Support</span>
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