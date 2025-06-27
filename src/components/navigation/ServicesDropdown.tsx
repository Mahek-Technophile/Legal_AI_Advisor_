import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, FileText, MessageSquare, Shield, Lock, Search } from 'lucide-react';
import { useFirebaseAuth } from '../../contexts/FirebaseAuthContext';

interface Service {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

export function ServicesDropdown() {
  const navigate = useNavigate();
  const { user, isConfigured } = useFirebaseAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const services: Service[] = [
    {
      id: 'document-analysis',
      title: 'Document Analysis',
      icon: FileText,
      path: '/services/document-analysis'
    },
    {
      id: 'legal-questions',
      title: 'Legal Questions',
      icon: MessageSquare,
      path: '/services/legal-questions'
    },
    {
      id: 'deepsearch',
      title: 'DeepSearch',
      icon: Search,
      path: '/services/deepsearch'
    },
    {
      id: 'redaction-review',
      title: 'Redaction Review',
      icon: Shield,
      path: '/services/redaction-review'
    }
  ];

  // Load selected country from localStorage
  useEffect(() => {
    const savedCountry = localStorage.getItem('selectedCountry');
    if (savedCountry) {
      setSelectedCountry(savedCountry);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen]);

  const handleServiceClick = (service: Service) => {
    setIsOpen(false);
    
    if (!user) {
      // Show auth modal or redirect to login for unauthenticated users
      if (isConfigured) {
        // Trigger auth modal by navigating to home with state
        navigate('/', { state: { from: service.path, openAuth: true } });
      } else {
        alert('Please configure Firebase first to enable authentication features.');
      }
      return;
    }

    if (!selectedCountry) {
      // Redirect to jurisdiction selection if no country selected
      navigate('/jurisdiction-selection', { state: { from: service.path } });
      return;
    }

    // Navigate to the service
    navigate(service.path);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleDropdown();
          }
        }}
        className="flex items-center space-x-1 text-white/80 hover:text-white transition-all text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Services menu"
      >
        <span>Services</span>
        <ChevronDown 
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-2 w-64 bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-xl z-50 overflow-hidden animate-scale-in"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="services-menu"
        >
          {/* Services List */}
          <div className="py-2">
            {services.map((service) => {
              const IconComponent = service.icon;
              return (
                <button
                  key={service.id}
                  onClick={() => handleServiceClick(service)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleServiceClick(service);
                    }
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-white/10 transition-all group focus:outline-none focus:bg-white/10"
                  role="menuitem"
                  tabIndex={0}
                >
                  <IconComponent className="h-5 w-5 text-white/70 group-hover:text-white transition-colors flex-shrink-0" />
                  <span className="text-white/90 group-hover:text-white transition-colors font-medium">
                    {service.title}
                  </span>
                  {!user && (
                    <Lock className="h-4 w-4 text-white/50 ml-auto flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer for unauthenticated users */}
          {!user && (
            <div className="border-t border-white/20 p-3">
              <div className="text-center">
                <p className="text-xs text-white/60 mb-2">Sign in to access services</p>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    if (isConfigured) {
                      navigate('/', { state: { openAuth: true } });
                    } else {
                      alert('Please configure Firebase first to enable authentication features.');
                    }
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-all text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-400"
                  disabled={!isConfigured}
                >
                  Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}