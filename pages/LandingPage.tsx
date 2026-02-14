import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  Check, Users, 
  Calendar, Mail, LayoutTemplate,
  BrainCircuit, ScanLine, BarChart3, Play, 
  MessageSquare, Video, Plus, Minus,
  LayoutDashboard, Briefcase, Bell, Clock, ChevronDown, LogOut, CheckCircle, FileText, Settings, TrendingUp, MoreHorizontal, Download, BarChart2, Search, Activity, X
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Logo } from '../components/ui/Logo';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

// Scroll Animation Component
const FadeIn: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// Book Demo Modal Component
const BookDemoModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  // Load Calendly script when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      // Load Calendly CSS
      const link = document.createElement('link');
      link.href = 'https://assets.calendly.com/assets/external/widget.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      // Load Calendly JS
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      script.onload = () => {
        // Calendly will render the inline widget shortly after script load
        // Give it a short moment, then hide the loader
        setTimeout(() => setIsLoading(false), 1000);
      };
      document.body.appendChild(script);

      return () => {
        // Cleanup on unmount
        const existingLink = document.querySelector('link[href*="calendly.com"]');
        const existingScript = document.querySelector('script[src*="calendly.com"]');
        if (existingLink) existingLink.remove();
        if (existingScript) existingScript.remove();
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Calendly URL for product demo booking
  const calendlyUrl = import.meta.env.VITE_CALENDLY_URL || 'https://calendly.com/coreflowhr/product-demo';

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Close button floating on top-right */}
      <button 
        onClick={onClose} 
        className="absolute top-5 right-5 text-gray-300 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
        aria-label="Close"
      >
        <X size={24} />
      </button>

      {/* Calendly fills the content area directly */}
      <div className="relative w-full max-w-5xl h-[80vh]">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
            <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-600">Loading demo scheduler…</p>
          </div>
        )}

        <div
          className="calendly-inline-widget w-full h-full bg-white"
          data-url={calendlyUrl}
          style={{ minWidth: '320px', height: '100%' }}
        />
      </div>
    </div>,
    document.body
  );
};

const LandingPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const { user, session, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogout = async () => {
    // Don't await - signOut handles redirect immediately
    signOut();
  };

  // Get user display name
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  // Check subscription status for logged-in users
  useEffect(() => {
    const checkSubscription = async () => {
      if (!session || !user) {
        setSubscriptionLoading(false);
        setIsSubscribed(false);
        return;
      }

      try {
        const { data: settings, error: queryError } = await supabase
          .from('user_settings')
          .select('subscription_status, subscription_stripe_id, billing_plan_name')
          .eq('user_id', user.id)
          .maybeSingle();

        // If no settings found or error, user is not subscribed
        if (queryError) {
          // Suppress verbose errors for network timeouts (expected in poor network conditions)
          const isNetworkError = queryError.message?.includes('Failed to fetch') || 
                                 queryError.message?.includes('timeout') ||
                                 queryError.code === 'PGRST301' || // Supabase timeout error code
                                 queryError.message?.toLowerCase().includes('network');
          
          if (!isNetworkError) {
          console.error('Error fetching user settings:', queryError);
          }
          setIsSubscribed(false);
          setSubscriptionLoading(false);
          return;
        }

        if (!settings) {
          console.log('No user_settings row found for user - not subscribed');
          setIsSubscribed(false);
          setSubscriptionLoading(false);
          return;
        }

        console.log('Subscription check - User settings:', {
          subscription_status: settings.subscription_status,
          subscription_stripe_id: settings.subscription_stripe_id,
          billing_plan_name: settings.billing_plan_name,
          userId: user.id
        });

        // Check if user has an active subscription
        // Primary check: subscription_status is 'active'
        const hasActiveStatus = settings.subscription_status === 'active';
        
        // Secondary check: has a Stripe subscription ID (from webhook)
        const hasStripeId = settings.subscription_stripe_id !== null && 
                           settings.subscription_stripe_id !== undefined && 
                           settings.subscription_stripe_id !== '';
        
        // Tertiary check: has a paid plan name (not Basic/Free)
        const planName = (settings.billing_plan_name || '').toLowerCase();
        const hasPaidPlan = planName && 
                           planName !== 'basic' && 
                           planName !== 'free';

        const subscribed = hasActiveStatus || hasStripeId || hasPaidPlan;

        console.log('Subscription check result:', {
          hasActiveStatus,
          hasStripeId,
          hasPaidPlan,
          planName,
          subscribed,
          finalDecision: subscribed ? '✅ SUBSCRIBED - Will redirect to dashboard' : '❌ NOT SUBSCRIBED - Will show pricing'
        });

        setIsSubscribed(subscribed);
      } catch (error: any) {
        // Handle timeout and network errors gracefully
        if (error.message?.includes('timeout') || error.message?.includes('Failed to fetch')) {
          // Network issue - silently fail and assume not subscribed
          setIsSubscribed(false);
        } else {
        console.error('Error checking subscription:', error);
        setIsSubscribed(false);
        }
      } finally {
        setSubscriptionLoading(false);
      }
    };

    if (session && user) {
      checkSubscription();
    } else {
      setSubscriptionLoading(false);
    }
  }, [session, user]);

  // Scroll to pricing section if query param or hash is present
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const pricingParam = searchParams.get('pricing');
    const hashPricing = window.location.hash === '#pricing';
    
    if (pricingParam === 'true' || hashPricing) {
      setTimeout(() => {
        const element = document.getElementById('pricing');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          // Clean up query param from URL
          if (pricingParam === 'true') {
            searchParams.delete('pricing');
            const newUrl = window.location.pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
            window.history.replaceState({}, '', newUrl);
          }
        }
      }, 500);
    }
  }, []);

  // Handle subscription
  const handleSubscribe = async (plan: 'basic' | 'professional') => {
    if (!user || !session) {
      // Not logged in - redirect to signup with plan info
      navigate(`/signup?plan=${plan}&billing=${billingCycle}&returnTo=pricing`);
      return;
    }

    // Check if email is verified
    if (user && !user.email_confirmed_at) {
      navigate('/verify-email');
      return;
    }

    // Directly create Stripe checkout session
    try {
      const { createCheckoutSession } = await import('../services/stripe');
      
      console.log('Creating checkout session for plan:', plan, 'billing:', billingCycle);
      
      const { sessionId, url, error: checkoutError } = await createCheckoutSession(
        plan,
        billingCycle
      );

      console.log('Checkout session response:', { sessionId, url, error: checkoutError });

      if (checkoutError || !sessionId) {
        console.error('Checkout error:', checkoutError);
        alert(checkoutError || 'Failed to create checkout session');
        return;
      }

      // Redirect directly to Stripe Checkout URL
      if (url) {
        console.log('Redirecting to Stripe Checkout:', url);
        // Try to redirect - if it fails, show the URL to the user
        try {
          window.location.replace(url);
        } catch (redirectError) {
          console.error('Redirect failed:', redirectError);
          // Fallback: open in new window or show URL
          const openCheckout = window.confirm(
            `Redirect failed. Click OK to open checkout in a new window.\n\nURL: ${url}`
          );
          if (openCheckout) {
            window.open(url, '_blank');
          } else {
            // Show the URL so user can copy it
            alert(`Please visit this URL to complete checkout:\n\n${url}`);
          }
        }
      } else {
        console.error('No checkout URL received. Session ID:', sessionId);
        // If we have a sessionId, construct the URL manually
        if (sessionId) {
          const constructedUrl = `https://checkout.stripe.com/c/pay/${sessionId}`;
          console.warn('Constructing checkout URL manually:', constructedUrl);
          window.location.replace(constructedUrl);
        } else {
          alert('No checkout URL received. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      alert('Failed to process subscription. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-gray-100 selection:text-gray-900">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo - Full Logo with Symbol and Text */}
          <Link to="/" className="cursor-pointer flex items-center flex-shrink-0">
            <img 
              src="/assets/images/coreflow-logo.png" 
              alt="CoreFlow" 
              className="object-contain"
              style={{ 
                display: 'block',
                height: window.innerWidth < 640 ? '80px' : '150px',
                width: 'auto',
                maxWidth: '400px'
              }}
              onError={(e) => {
                console.error('❌ Logo image FAILED to load');
                const img = e.target as HTMLImageElement;
                img.style.border = '3px solid red';
                img.style.backgroundColor = '#fee';
              }}
              onLoad={() => {
                console.log('✅ Logo image LOADED successfully');
              }}
            />
          </Link>
          
          <div className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-medium text-gray-500">
            <button onClick={() => scrollToSection('features')} className="hover:text-gray-900 transition-colors">Features</button>
            <button onClick={() => scrollToSection('benefits')} className="hover:text-gray-900 transition-colors">Why CoreFlow</button>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-gray-900 transition-colors">Pricing</button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-gray-900 transition-colors">FAQ</button>
          </div>

          <div className="flex items-center gap-4">
            {user && session ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="font-semibold rounded-full px-6"
                onClick={handleLogout}
                icon={<LogOut size={14} />}
              >
                Logout
              </Button>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
                  Sign in
                </Link>
                <Link to="/signup">
                  <Button variant="black" size="sm" className="font-semibold rounded-full px-6">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 md:pt-40 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6 max-w-7xl mx-auto text-center relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full sm:w-[1000px] h-[400px] sm:h-[600px] bg-[radial-gradient(circle,rgba(240,240,240,1)0%,rgba(255,255,255,0)70%)] -z-10 pointer-events-none"></div>

        <FadeIn>
          {/* Custom Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-gray-200 bg-white shadow-sm text-xs sm:text-sm font-medium text-gray-600 mb-6 sm:mb-8 cursor-default hover:border-gray-300 transition-colors">
            <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-red-500 animate-pulse"></span>
            We are live
          </div>
          
          {/* High Contrast Typography */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-4 sm:mb-6 md:mb-8 leading-[1.1] max-w-5xl mx-auto px-4">
            <span className="text-gray-900">Built for Recruitment Agencies</span> <br />
            <span className="text-gray-400">Scale placements with AI automation</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-8 sm:mb-10 md:mb-12 leading-relaxed font-light px-4">
            Self-service candidate registration. Zero manual data entry. Handle 5x more placements.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12 sm:mb-16 md:mb-24 px-4">
            {user && session ? (
              <Button 
                variant="black" 
                size="xl" 
                className="h-12 sm:h-14 px-6 sm:px-8 rounded-full text-sm sm:text-base shadow-xl shadow-gray-900/10 hover:shadow-gray-900/20 transition-all w-full sm:w-auto"
                disabled={subscriptionLoading}
                onClick={() => {
                  // If subscription check is still loading, wait
                  if (subscriptionLoading) {
                    console.log('Subscription check still loading...');
                    return;
                  }
                  
                  // If user has paid subscription, go to dashboard; otherwise show pricing
                  console.log('Start Hiring Now clicked - isSubscribed:', isSubscribed);
                  if (isSubscribed) {
                    console.log('Redirecting to dashboard');
                    navigate('/dashboard');
                  } else {
                    console.log('Scrolling to pricing section');
                    scrollToSection('pricing');
                  }
                }}
              >
                {subscriptionLoading ? 'Loading...' : 'Start Hiring Now'}
              </Button>
            ) : (
              <Link to="/signup" className="w-full sm:w-auto">
                <Button variant="black" size="xl" className="h-12 sm:h-14 px-6 sm:px-8 rounded-full text-sm sm:text-base shadow-xl shadow-gray-900/10 hover:shadow-gray-900/20 transition-all w-full sm:w-auto">
                  Start Hiring Now
                </Button>
              </Link>
            )}
            <Button 
              variant="outline" 
              size="xl" 
              className="h-12 sm:h-14 px-6 sm:px-8 rounded-full text-sm sm:text-base bg-white hover:bg-gray-50 border-gray-200 w-full sm:w-auto" 
              icon={<Calendar size={16} />}
              onClick={() => setShowDemoModal(true)}
            >
              Book a Demo
            </Button>
          </div>
        </FadeIn>

        {/* Dashboard Preview */}
        <FadeIn delay={200}>
            <div className="relative rounded-t-2xl sm:rounded-t-3xl border-x border-t border-gray-200 bg-white shadow-2xl shadow-gray-200/50 mx-auto max-w-6xl overflow-hidden group px-2 sm:px-0">
                {/* Browser Chrome */}
                <div className="h-8 sm:h-10 border-b border-gray-100 flex items-center px-2 sm:px-4 gap-1.5 sm:gap-2 bg-gray-50/50">
                    <div className="flex gap-1 sm:gap-1.5">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-400"></div>
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="ml-2 sm:ml-4 flex-1 max-w-lg h-5 sm:h-6 bg-white border border-gray-200 rounded-md flex items-center px-2 sm:px-3 text-[8px] sm:text-[10px] text-gray-400 shadow-sm">
                        <span className="text-gray-300 mr-1 sm:mr-2">🔒</span> <span className="hidden xs:inline">coreflowhr.com/dashboard</span><span className="xs:hidden">coreflow...</span>
                    </div>
                </div>

                {/* Dashboard UI Replica */}
                <div className="flex h-[400px] sm:h-[500px] md:h-[600px] overflow-hidden bg-white text-left font-sans">
                    
                    {/* Sidebar Replica */}
                    <div className="w-48 sm:w-56 md:w-60 bg-white border-r border-gray-200 hidden lg:flex flex-col flex-shrink-0">
                        <div className="px-6 py-4 mb-1 flex items-center justify-between">
                            <img 
                                src="/assets/images/coreflow-logo.png" 
                                alt="CoreFlow" 
                                className="object-contain flex-shrink-0"
                                style={{ 
                                    height: '130px',
                                    width: 'auto',
                                    maxWidth: '300px'
                                }}
                            />
                        </div>
                        <div className="px-4 space-y-1">
                            <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-100 text-gray-900 rounded-lg text-sm font-medium">
                                <LayoutDashboard size={16} /> Dashboard
                            </div>
                            <div className="flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:bg-gray-50 rounded-lg text-sm font-medium">
                                <Briefcase size={16} /> Jobs
                            </div>
                            <div className="flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:bg-gray-50 rounded-lg text-sm font-medium">
                                <Users size={16} /> Candidates
                            </div>
                            <div className="flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:bg-gray-50 rounded-lg text-sm font-medium">
                                <Calendar size={16} /> Calendar
                            </div>
                            <div className="flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:bg-gray-50 rounded-lg text-sm font-medium">
                                <FileText size={16} /> Offers
                            </div>
                            <div className="flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:bg-gray-50 rounded-lg text-sm font-medium">
                                <Settings size={16} /> Settings
                            </div>
                        </div>
                        <div className="mt-auto p-4 border-t border-gray-100">
                             <div className="flex items-center gap-3 p-2">
                                <Avatar name="Alex Johnson" className="w-8 h-8 text-[10px]" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-900">Alex Johnson</span>
                                    <span className="text-[10px] text-gray-500">Recruiter Admin</span>
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* Main Content Replica */}
                    <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto overflow-x-hidden flex flex-col gap-4 sm:gap-5 md:gap-6 bg-gray-50/30 min-w-0 w-full">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full min-w-0 gap-3 sm:gap-0">
                            <div>
                                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Welcome back, Alex</h2>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">Here's what's happening in your pipeline today.</p>
                            </div>
                            <div className="flex gap-2 sm:gap-3 items-center">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 bg-white">
                                    <Bell size={14} className="sm:w-[18px] sm:h-[18px]" />
                                </div>
                                <div className="bg-black text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-gray-900/20">
                                    <Plus size={12} className="sm:w-[14px] sm:h-[14px]" /> <span className="hidden sm:inline">Post a Job</span><span className="sm:hidden">Post</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4 w-full min-w-0 flex-shrink-0">
                             {[
                                { label: 'Active Jobs', val: '12', trend: '+2', icon: Briefcase },
                                { label: 'Total Candidates', val: '842', trend: '+15%', icon: Users },
                                { label: 'Qualified Candidates', val: '24', trend: '+4%', icon: CheckCircle },
                                { label: 'Avg Time to Fill', val: '18d', trend: '-2d', icon: Clock }
                             ].map((stat, i) => (
                                 <div key={i} className="bg-white p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border border-gray-200 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow min-w-0 w-full">
                                     <div className="min-w-0 flex-1">
                                         <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5 sm:mb-1 block">{stat.label}</span>
                                         <span className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 block tracking-tight">{stat.val}</span>
                                         <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                                             <TrendingUp size={10} className={`sm:w-3 sm:h-3 ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-gray-400'}`} />
                                             <span className={`text-[9px] sm:text-[10px] font-medium ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-gray-500'}`}>
                                                 {stat.trend} <span className="text-gray-400 hidden sm:inline">{stat.label === 'Avg Time to Fill' ? 'improvement' : 'vs last month'}</span>
                                             </span>
                                         </div>
                                     </div>
                                     <div className="p-1.5 sm:p-2 md:p-2.5 rounded-lg bg-gray-50 text-gray-900 border border-gray-100 flex-shrink-0">
                                        <stat.icon size={14} className="sm:w-[16px] sm:h-[16px] md:w-[18px] md:h-[18px]" />
                                     </div>
                                 </div>
                             ))}
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-3 gap-6 w-full min-w-0 flex-shrink-0">
                            {/* Recruitment Flow */}
                            <div className="col-span-2 bg-white rounded-2xl border border-gray-200 p-6 flex flex-col shadow-sm min-w-0 w-full">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                                    <h2 className="text-lg font-bold text-gray-900">Recruitment Flow</h2>
                                    <div className="flex gap-1 mt-2 sm:mt-0">
                                        <span className="text-[10px] font-medium px-2 py-0.5 bg-white border border-gray-200 text-gray-500 rounded">4w</span>
                                        <span className="text-[10px] font-medium px-2 py-0.5 bg-white border border-gray-200 text-gray-500 rounded">8w</span>
                                        <span className="text-[10px] font-medium px-2 py-0.5 bg-black text-white border border-black rounded">12w</span>
                                    </div>
                                </div>
                                <div className="flex gap-6 border-b border-gray-100 mb-4">
                                  <div className="pb-2 text-xs font-medium text-gray-900 relative">
                                    New Candidates
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black rounded-full"></span>
                                  </div>
                                  <div className="pb-2 text-xs font-medium text-gray-400">Weekly Avg</div>
                                  <div className="pb-2 text-xs font-medium text-gray-400">Screening</div>
                                  <div className="pb-2 text-xs font-medium text-gray-400">Interviews</div>
                                  <div className="pb-2 text-xs font-medium text-gray-400">Offers</div>
                                  <div className="pb-2 text-xs font-medium text-gray-400">Hired</div>
                                </div>
                                <div className="h-[240px] w-full relative flex-1 min-w-0 overflow-hidden">
                                    {/* SVG Chart Replica */}
                                    <svg viewBox="0 0 600 220" className="w-full h-full">
                                         <defs>
                                            <linearGradient id="chartGradient3" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity="0.1" />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        {/* Grid Lines */}
                                        <line x1="0" y1="50" x2="600" y2="50" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
                                        <line x1="0" y1="110" x2="600" y2="110" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
                                        <line x1="0" y1="170" x2="600" y2="170" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
                                        <path d="M0,180 C50,160 100,170 150,140 C200,110 250,130 300,90 C350,50 400,70 450,40 C500,10 550,30 600,60 V220 H0 Z" fill="url(#chartGradient3)" />
                                        <path d="M0,180 C50,160 100,170 150,140 C200,110 250,130 300,90 C350,50 400,70 450,40 C500,10 550,30 600,60" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="col-span-1 min-w-0 w-full">
                                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm w-full h-full">
                                    <h3 className="font-bold text-gray-900 text-lg mb-4">Quick Actions</h3>
                                    <button className="w-full bg-black text-white rounded-lg py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium mb-3 shadow-sm hover:bg-gray-800 transition-colors">
                                        <Calendar size={16} /> Schedule Interview
                                    </button>
                                    <button className="w-full bg-white border border-gray-200 text-gray-700 rounded-lg py-2.5 px-4 flex items-center justify-between text-sm font-medium hover:bg-gray-50 transition-colors mb-3">
                                        <div className="flex items-center gap-2"><Briefcase size={16} className="text-gray-500" /> Export</div>
                                        <Download size={16} className="text-gray-400" />
                                    </button>
                                    <button className="w-full bg-white border border-gray-200 text-gray-700 rounded-lg py-2.5 px-4 flex items-center justify-between text-sm font-medium hover:bg-gray-50 transition-colors mb-3">
                                        <div className="flex items-center gap-2"><Briefcase size={16} className="text-gray-500" /> Bulk Actions</div>
                                        <ChevronDown size={16} className="text-gray-400" />
                                    </button>
                                    <button className="w-full bg-white border border-gray-200 text-gray-700 rounded-lg py-2.5 px-4 flex items-center justify-between text-sm font-medium hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-2"><BarChart2 size={16} className="text-gray-500" /> Generate Report</div>
                                        <ChevronDown size={16} className="text-gray-400" />
                                    </button>
                                </div>
                            </div>
                                </div>

                        {/* Row 3: Upcoming Interviews, Recent Candidates, Activity */}
                        <div className="grid grid-cols-3 gap-6 w-full min-w-0 flex-shrink-0">
                            {/* Upcoming Interviews */}
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm min-w-0 w-full flex flex-col max-h-[200px]">
                                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                    <h3 className="font-bold text-gray-900 text-lg">Upcoming Interviews</h3>
                                    <button className="h-8 w-8 p-0 hover:bg-gray-50 rounded-lg transition-colors">
                                        <MoreHorizontal size={16} className="text-gray-400" />
                                    </button>
                                    </div>
                                <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
                                    {[
                                        {name: 'Sarah Jenkins', job: 'Prod Designer', time: '10:00 AM', date: 'Today'},
                                        {name: 'Mike Ross', job: 'Backend Engineer', time: '2:00 PM', date: 'Today'},
                                        {name: 'Emma Watson', job: 'Frontend Dev', time: '11:00 AM', date: 'Tomorrow'}
                                    ].slice(0, 2).map((int, i) => (
                                        <div key={i} className="flex gap-3 pb-2">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex-shrink-0"></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-900 truncate">{int.name}</p>
                                                <p className="text-[10px] text-gray-500 truncate">{int.job}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{int.date} • {int.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Jobs in Progress */}
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm min-w-0 w-full flex flex-col max-h-[200px]">
                                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                    <h3 className="font-bold text-gray-900 text-lg">Jobs in Progress</h3>
                                    <button className="h-8 w-8 p-0 hover:bg-gray-50 rounded-lg transition-colors">
                                        <Plus size={16} className="text-gray-400" />
                                    </button>
                                </div>
                                <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
                                    {[
                                        {title: 'Prod Designer', dept: 'Design', count: '42'},
                                        {title: 'Backend Engineer', dept: 'Engineering', count: '28'},
                                        {title: 'Frontend Dev', dept: 'Engineering', count: '15'}
                                    ].slice(0, 2).map((job, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 rounded-xl border border-gray-100 hover:border-gray-300 transition-all group bg-gray-50/30">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">{job.title.charAt(0)}</div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-gray-900 truncate">{job.title}</p>
                                                    <p className="text-[10px] text-gray-500 truncate">{job.dept}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0 ml-2">
                                                <p className="text-xs font-bold text-gray-900">{job.count}</p>
                                                <p className="text-[9px] text-gray-500 uppercase tracking-wide">Applied</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Activity Feed */}
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col min-w-0 w-full max-h-[200px]">
                                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                                        <Activity size={18} /> Activity Feed
                                    </h3>
                                    <button className="h-8 w-8 p-0 hover:bg-gray-50 rounded-lg transition-colors">
                                        <MoreHorizontal size={16} className="text-gray-400" />
                                    </button>
                                </div>
                                <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 flex-1 overflow-y-auto min-h-0 pr-2">
                                        {[
                                            {u: 'Alex', a: 'moved', t: 'Sarah Jenkins', time: '2h ago'},
                                            {u: 'System', a: 'posted', t: 'Prod Designer', time: '4h ago'},
                                            {u: 'Sarah', a: 'rejected', t: 'Mike Ross', time: '1d ago'}
                                    ].slice(0, 2).map((act, i) => (
                                        <div key={i} className="relative pl-6 pb-2">
                                            <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-white border-2 border-gray-200 z-10"></div>
                                            <p className="text-[11px] text-gray-900 leading-relaxed"><span className="font-bold">{act.u}</span> {act.a} <span className="font-medium border-b border-gray-300">{act.t}</span></p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{act.time}</p>
                                            </div>
                                        ))}
                                     </div>
                                </div>
                            </div>
                        
                        {/* Row 4: Recently Sourced */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm w-full min-w-0 flex-shrink-0">
                            <div className="flex items-center justify-between mb-5 w-full min-w-0">
                                <h3 className="font-bold text-gray-900 text-lg">Recently Sourced</h3>
                                <div className="relative hidden sm:block">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input 
                                        type="text" 
                                        placeholder="Search..." 
                                        className="pl-9 pr-4 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-black transition-colors" 
                                    />
                        </div>
                    </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
                                {[
                                    {name: 'Sarah Jenkins', role: 'Prod Designer', stage: 'Screening'},
                                    {name: 'Mike Ross', role: 'Backend Engineer', stage: 'Interview'},
                                    {name: 'Emma Watson', role: 'Frontend Dev', stage: 'Offer'},
                                    {name: 'John Doe', role: 'Product Manager', stage: 'Hired'}
                                ].map((cand, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                        <div className="relative">
                                            <Avatar name={cand.name} className="w-10 h-10 border border-gray-200" />
                                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{cand.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{cand.role}</p>
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 font-medium">{cand.stage}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </FadeIn>
      </section>

      {/* Why Choose CoreFlow */}
      <section id="benefits" className="py-12 sm:py-16 md:py-24 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
             <FadeIn>
               <div className="text-center mb-8 sm:mb-10 md:mb-12">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 tracking-tight px-4">Why Agencies Choose CoreFlow</h2>
               </div>
             </FadeIn>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {[
                    { 
                        title: "Self-Service Registration", 
                        desc: "Candidates register themselves. Zero manual data entry.",
                        improvement: "10x",
                        points: ["10 minutes → 10 seconds", "Zero manual data entry", "Structured profiles automatically"]
                    },
                    { 
                        title: "AI Email Generation", 
                        desc: "One-click personalized emails. No more typing the same message 50 times.",
                        improvement: "50x",
                        points: ["One-click generation", "Personalized content", "Saves hours per day"]
                    },
                    { 
                        title: "Multi-Client Management", 
                        desc: "Organize jobs by client. Filter, group, and report per client.",
                        improvement: "100%",
                        points: ["Organize by client", "Client-specific views", "Professional reporting"]
                    },
                    { 
                        title: "Automated Workflows", 
                        desc: "Set once, works forever. Stage changes trigger emails automatically.",
                        improvement: "5x",
                        points: ["Automated follow-ups", "Consistent communication", "Handle 5x more placements"]
                    }
                 ].map((item, i) => (
                     <FadeIn key={i} delay={i * 100}>
                       <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col hover:-translate-y-1 transition-transform duration-300 border-t-[3px] border-black h-full">
                           <div className="p-6 flex-1">
                               <h3 className="text-lg font-bold text-gray-900 mb-3">{item.title}</h3>
                               <p className="text-sm text-gray-500 leading-relaxed mb-6">{item.desc}</p>
                               
                               <div className="space-y-2">
                                   <div className="flex justify-between text-xs font-semibold">
                                       <span className="text-gray-500">Improvement</span>
                                       <span className="text-gray-900">{item.improvement}</span>
                                   </div>
                                   <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                       <div className="h-full bg-gray-900 rounded-full" style={{ width: item.improvement.replace('100%', '100%').replace('99.2%', '99%') }}></div>
                                   </div>
                               </div>
                           </div>
                           <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                               <div className="flex flex-wrap gap-x-2 gap-y-1 justify-center text-center">
                                   {item.points.map((point, idx) => (
                                       <span key={idx} className="text-[10px] font-medium text-gray-600 flex items-center gap-1">
                                           {idx > 0 && <span className="w-0.5 h-0.5 rounded-full bg-gray-400"></span>}
                                           {point}
                                       </span>
                                   ))}
                               </div>
                           </div>
                       </div>
                     </FadeIn>
                 ))}
             </div>
        </div>
      </section>

      {/* Features Section (Bento Grid) */}
      <section id="features" className="py-16 sm:py-24 md:py-32 max-w-7xl mx-auto px-4 sm:px-6">
        <FadeIn>
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 md:mb-20">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 tracking-tight px-4">Everything you need <br/><span className="text-gray-400">to hire the best.</span></h2>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. AI Matching (Large) */}
            <div className="md:col-span-2 bg-white border border-gray-200 rounded-[2rem] p-10 relative overflow-hidden group hover:border-gray-300 transition-colors shadow-sm">
                <FadeIn delay={100}>
                  <div className="w-12 h-12 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center mb-6 text-gray-900">
                      <BrainCircuit size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">AI-Powered Candidate Matching</h3>
                  <p className="text-gray-500 text-lg max-w-lg leading-relaxed">
                    Our LLM engine analyzes resumes against job descriptions to generate a match score from 0-100. Spot the best talent instantly without manual screening.
                  </p>
                  {/* Decorative UI */}
                  <div className="absolute right-8 bottom-8 flex flex-col gap-3 opacity-50 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500">
                      <div className="bg-white p-3 rounded-xl shadow-md border border-gray-100 flex items-center gap-3 w-64">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-xs">98</div>
                          <div className="flex-1">
                              <div className="h-2 w-24 bg-gray-200 rounded mb-1"></div>
                              <div className="h-1.5 w-16 bg-gray-100 rounded"></div>
                          </div>
                      </div>
                  </div>
                </FadeIn>
            </div>

            {/* 2. Resume Screening */}
            <div className="bg-white border border-gray-200 rounded-[2rem] p-8 group hover:border-gray-300 transition-colors relative overflow-hidden flex flex-col justify-between shadow-sm">
                 <FadeIn delay={200}>
                   <div>
                      <div className="w-12 h-12 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center mb-6 text-gray-900">
                          <ScanLine size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Resume Parsing</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">Extract skills, experience, and education from PDF resumes automatically.</p>
                   </div>
                   <div className="mt-8 border-t border-gray-100 pt-4 flex gap-2">
                      <span className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-[10px] text-gray-500">React</span>
                      <span className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-[10px] text-gray-500">Node.js</span>
                   </div>
                 </FadeIn>
            </div>

            {/* 3. Scheduling */}
            <div className="bg-white border border-gray-200 rounded-[2rem] p-8 group hover:border-gray-300 transition-colors relative overflow-hidden shadow-sm">
                 <FadeIn delay={300}>
                   <div className="w-12 h-12 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center mb-6 text-gray-900">
                      <Calendar size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Scheduling</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">Syncs with Google Calendar to auto-generate Meet links and avoid double bookings.</p>
                 </FadeIn>
            </div>

             {/* 4. Pipeline (Large) */}
             <div className="md:col-span-2 bg-white border border-gray-200 rounded-[2rem] p-10 overflow-hidden relative hover:border-gray-300 transition-colors shadow-sm">
                <FadeIn delay={400}>
                  <div className="relative z-10 max-w-md">
                       <div className="w-12 h-12 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center mb-6 text-gray-900">
                          <LayoutTemplate size={24} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Visual Pipeline Management</h3>
                      <p className="text-gray-500 text-lg leading-relaxed">
                        Drag-and-drop Kanban boards to track candidates from "Applied" to "Hired". Automate email triggers as candidates move stages.
                      </p>
                  </div>
                  {/* Mock Pipeline UI */}
                  <div className="absolute -right-10 top-12 w-[400px] opacity-70 group-hover:opacity-100 transition-opacity">
                      <div className="space-y-3">
                          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm transform rotate-3 hover:rotate-0 transition-transform duration-500">
                              <div className="flex gap-3 items-center mb-3">
                                  <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                                  <div>
                                      <div className="h-2 w-24 bg-gray-200 rounded mb-1"></div>
                                      <div className="h-1.5 w-16 bg-gray-100 rounded"></div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                </FadeIn>
            </div>

            {/* 6. Deep Analytics (With Chart) */}
            <div className="md:col-span-3 bg-black rounded-[2rem] p-10 flex flex-col lg:flex-row items-center gap-12 group shadow-2xl overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black z-0"></div>
                
                <div className="flex-1 relative z-10">
                     <FadeIn delay={500}>
                       <div className="w-12 h-12 bg-white/10 rounded-xl border border-white/10 flex items-center justify-center mb-6 text-white">
                          <BarChart3 size={24} />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3">Deep Analytics & Insights</h3>
                      <p className="text-gray-400 text-lg leading-relaxed max-w-xl">
                        Understand your hiring funnel. Measure time-to-hire, source effectiveness, and diversity metrics.
                      </p>
                      <div className="flex gap-8 mt-8">
                          <div>
                              <p className="text-3xl font-bold text-white">12d</p>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Time to Hire</p>
                          </div>
                          <div>
                              <p className="text-3xl font-bold text-white">85%</p>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Offer Acceptance</p>
                          </div>
                      </div>
                     </FadeIn>
                </div>
                
                {/* Chart Visual */}
                <div className="flex-1 w-full relative z-10">
                    <FadeIn delay={600}>
                      <div className="bg-gray-900/50 rounded-2xl border border-white/10 p-6 w-full backdrop-blur-md">
                          <div className="flex justify-between items-center mb-6">
                              <span className="text-sm font-medium text-gray-300">Hiring Velocity</span>
                          </div>
                          {/* SVG Area Chart */}
                          <div className="h-48 w-full relative">
                              <svg viewBox="0 0 400 150" className="w-full h-full overflow-visible">
                                  <defs>
                                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
                                          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                                      </linearGradient>
                                  </defs>
                                  <path d="M0,120 C50,100 100,130 150,80 C200,30 250,60 300,40 C350,20 380,30 400,10 V150 H0 Z" fill="url(#chartGradient)" />
                                  <path d="M0,120 C50,100 100,130 150,80 C200,30 250,60 300,40 C350,20 380,30 400,10" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                          </div>
                      </div>
                    </FadeIn>
                </div>
            </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section id="integrations" className="py-32 max-w-7xl mx-auto px-6 bg-gray-50/50 border-y border-gray-200">
          <FadeIn>
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">Seamless Integrations</h2>
              <p className="text-gray-500 max-w-xl mx-auto">CoreFlow plays nicely with the tools you already use.</p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: MessageSquare, name: "Slack", desc: "Get real-time notifications and channel updates.", color: "text-gray-900" },
                { icon: Mail, name: "Google Workspace", desc: "Sync emails and calendar events automatically.", color: "text-red-500" },
                { icon: Video, name: "Zoom", desc: "Auto-generate unique meeting links for interviews.", color: "text-blue-500" },
              ].map((tool, i) => (
                  <FadeIn key={i} delay={i * 100}>
                    <div className="flex flex-col p-8 bg-white border border-gray-200 rounded-3xl hover:border-gray-300 hover:shadow-lg transition-all duration-300 group h-full">
                        <div className={`w-14 h-14 flex items-center justify-center mb-6 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm group-hover:scale-110 transition-transform ${tool.color}`}>
                            <tool.icon size={28} />
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 mb-2">{tool.name}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">{tool.desc}</p>
                    </div>
                  </FadeIn>
              ))}
          </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-24 md:py-32 max-w-7xl mx-auto px-4 sm:px-6">
        <FadeIn>
          <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-0.5 sm:py-1 rounded-full border border-gray-200 bg-white shadow-sm text-xs font-medium text-gray-600 mb-4 sm:mb-6">
                 <span className="text-gray-400">★</span> Simple, Transparent Pricing
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 tracking-tighter px-4">Choose Your <br/> Perfect Plan</h2>
              <p className="text-gray-500 text-sm sm:text-base max-w-xl mx-auto px-4">
                Start with a free trial, then choose the plan that scales with your recruitment needs. No hidden fees, cancel anytime.
              </p>
          </div>

          {/* Monthly/Yearly Toggle */}
          <div className="flex justify-center mb-16">
              <div className="bg-gray-100 p-1.5 rounded-xl flex items-center relative">
                  <button 
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${billingCycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                      Monthly
                  </button>
                  <button 
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${billingCycle === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                      Yearly
                  </button>
                  {/* Badge */}
                  <div className="absolute -right-24 top-1.5 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm animate-bounce">
                      Save 20%
                  </div>
              </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
             {/* Basic Plan */}
             <FadeIn delay={100}>
               <div className="bg-white rounded-2xl sm:rounded-[2rem] p-6 sm:p-8 md:p-10 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                   <div className="mb-6 sm:mb-8">
                       <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Basic Plan</h3>
                       <div className="flex items-baseline gap-1 mb-2">
                           <span className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-gray-900">
                               ${billingCycle === 'monthly' ? '49' : '41'}
                           </span>
                           <span className="text-sm sm:text-base text-gray-500 font-medium">per month</span>
                       </div>
                       <p className="text-sm text-gray-500 mt-1">
                         Designed for solo recruiters and small teams who want CoreFlow to replace manual sourcing and spreadsheet tracking.
                       </p>
                   </div>
                   
                   {user && session ? (
                     <Button 
                       variant="outline" 
                       size="lg" 
                       className="w-full mb-6 sm:mb-8 md:mb-10 border-gray-300 text-gray-900 hover:bg-gray-50 text-sm sm:text-base"
                       onClick={() => handleSubscribe('basic')}
                     >
                       Subscribe Now
                     </Button>
                   ) : (
                     <Link to="/signup">
                       <Button variant="outline" size="lg" className="w-full mb-6 sm:mb-8 md:mb-10 border-gray-300 text-gray-900 hover:bg-gray-50 text-sm sm:text-base">Start Free Trial</Button>
                     </Link>
                   )}
                   
                   <div className="space-y-6 flex-1">
                       <p className="font-bold text-sm text-gray-900 uppercase tracking-wide">FEATURES</p>
                       <p className="text-sm text-gray-500 mb-4">Everything you need to run a focused, high-signal hiring pipeline.</p>
                       <ul className="space-y-4">
                           {[
                               "Up to 5 active roles at a time", 
                               "AI-scored shortlists up to 100 candidates per role", 
                               "Up to 1,000 sourced candidates per month", 
                               "30 AI analyses per month",
                               "3 email workflows",
                               "AI-powered candidate matching",
                               "Email templates",
                               "Basic analytics",
                               "Email support"
                           ].map((feat, i) => (
                               <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                                   <div className="mt-0.5 bg-black rounded-full p-0.5 text-white">
                                       <Check size={10} strokeWidth={4} />
                                   </div>
                                   {feat}
                               </li>
                           ))}
                       </ul>
                   </div>
               </div>
             </FadeIn>

             {/* Professional Plan */}
             <FadeIn delay={200}>
               <div className="bg-white rounded-2xl sm:rounded-[2rem] p-6 sm:p-8 md:p-10 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col relative overflow-hidden">
                   <div className="mb-6 sm:mb-8">
                       <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Professional Plan</h3>
                       <div className="flex items-baseline gap-1 mb-2">
                           <span className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-gray-900">
                               ${billingCycle === 'monthly' ? '99' : '83'}
                           </span>
                           <span className="text-sm sm:text-base text-gray-500 font-medium">per month</span>
                       </div>
                       <p className="text-sm text-gray-500 mt-1">
                         For modern recruiting teams who want CoreFlow to replace multiple tools—ATS, sourcing, and outreach—in a single workflow.
                       </p>
                   </div>
                   
                   {user && session ? (
                     <Button 
                       variant="black" 
                       size="lg" 
                       className="w-full mb-6 sm:mb-8 md:mb-10 text-sm sm:text-base"
                       onClick={() => handleSubscribe('professional')}
                     >
                       Subscribe Now
                     </Button>
                   ) : (
                     <Link to="/signup">
                       <Button variant="black" size="lg" className="w-full mb-6 sm:mb-8 md:mb-10 text-sm sm:text-base">Start Free Trial</Button>
                     </Link>
                   )}
                   
                   <div className="space-y-6 flex-1">
                       <p className="font-bold text-sm text-gray-900 uppercase tracking-wide">FEATURES</p>
                       <p className="text-sm text-gray-500 mb-4">Advanced automation and analytics to scale hiring across many roles.</p>
                       <ul className="space-y-4">
                           {[
                               "Up to 25 active roles (base) + buy more as you scale", 
                               "AI-ranked sourcing up to 300 candidates per role", 
                               "Up to 4,000 sourced candidates per month (base)", 
                               "100 AI analyses per month",
                               "10 email workflows",
                               "AI email generation",
                               "Advanced analytics & reports",
                               "Integrations (Google Calendar, Meet, Teams)",
                               "Priority support",
                               "Option to purchase additional volume if you outgrow the base limits"
                           ].map((feat, i) => (
                               <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                                   <div className="mt-0.5 bg-black rounded-full p-0.5 text-white">
                                       <Check size={10} strokeWidth={4} />
                                   </div>
                                   {feat}
                               </li>
                           ))}
                       </ul>
                   </div>
               </div>
             </FadeIn>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 sm:py-24 md:py-32 max-w-7xl mx-auto px-4 sm:px-6 border-t border-gray-100">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12 lg:gap-24">
            {/* Left Header */}
            <div className="lg:col-span-1">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tighter leading-[0.9] mb-4 sm:mb-6">
                    Frequently <br/> asked <br/> questions
                </h2>
            </div>

            {/* Right Accordion */}
            <div className="lg:col-span-2 space-y-0">
                {[
                    { q: "What is CoreFlow and how does it work?", a: "CoreFlow is a recruitment platform built for agencies. It centralizes job postings, candidates, and interviews in one place—with self-service registration, multi-client management, and AI-powered sourcing. Create an account, add clients, post jobs, and track candidates through the pipeline." },
                    { q: "How does CoreFlow use my data to build custom AI insights?", a: "We use your job descriptions and candidate resumes to generate match scores. Data is processed securely using enterprise-grade LLMs and is never shared with third parties or used to train public models." },
                    { q: "How do I get started with CoreFlow and what are the pricing options?", a: "You can start for free with our trial. We offer a Basic Plan for small teams and a Professional Plan for growing companies. See our Pricing section above for details." },
                    { q: "What payment methods do you accept?", a: "We accept all major credit cards, PayPal, and bank transfers for enterprise customers." }
                ].map((item, i) => (
                    <div key={i} className="border-b border-gray-200 py-6">
                        <button 
                            onClick={() => toggleFaq(i)}
                            className="w-full text-left flex items-center justify-between text-lg font-medium text-gray-900 hover:text-gray-600 transition-colors"
                        >
                            {item.q}
                            {openFaq === i ? <Minus size={20} className="text-gray-900"/> : <Plus size={20} className="text-gray-900"/>}
                        </button>
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === i ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                            <p className="text-gray-500 leading-relaxed pr-8">
                                {item.a}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Massive Footer */}
      <footer className="bg-gray-100 pt-12 sm:pt-16 md:pt-24 pb-8 sm:pb-10 overflow-hidden relative border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8 sm:mb-12 md:mb-16">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 sm:gap-6 md:gap-8">
                 <div className="text-gray-400 text-xs sm:text-sm">
                     © 2025 CoreFlow HR. All rights reserved.
                 </div>
                 <div className="flex gap-4 sm:gap-6 md:gap-8 text-xs sm:text-sm text-gray-500">
                     <Link to="/terms" className="hover:text-gray-900 transition-colors">Terms of Service</Link>
                     <Link to="/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</Link>
                 </div>
             </div>
        </div>

        {/* Giant Text */}
        <div className="w-full flex justify-center border-t border-transparent">
            <h1 className="text-[15vw] sm:text-[16vw] md:text-[18vw] font-bold tracking-tighter leading-none text-black select-none text-center">
                coreflow
            </h1>
        </div>
      </footer>
      
      {/* Book Demo Modal */}
      <BookDemoModal isOpen={showDemoModal} onClose={() => setShowDemoModal(false)} />
    </div>
  );
};

export default LandingPage;

