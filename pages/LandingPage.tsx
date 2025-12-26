import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Check, Users, 
  Calendar, Mail, LayoutTemplate,
  BrainCircuit, ScanLine, BarChart3, Play, 
  MessageSquare, Video, Plus, Minus,
  LayoutDashboard, Briefcase, Bell, Clock, ChevronDown, LogOut
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

const LandingPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
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
    await signOut();
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
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo - Full Logo with Symbol and Text */}
          <Link to="/" className="cursor-pointer flex items-center flex-shrink-0">
            <img 
              src="/assets/images/coreflow-logo.png" 
              alt="CoreFlow" 
              className="object-contain"
              style={{ 
                display: 'block',
                height: '150px',
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
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
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
      <section className="pt-40 pb-20 px-6 max-w-7xl mx-auto text-center relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[radial-gradient(circle,rgba(240,240,240,1)0%,rgba(255,255,255,0)70%)] -z-10 pointer-events-none"></div>

        <FadeIn>
          {/* Custom Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 bg-white shadow-sm text-sm font-medium text-gray-600 mb-8 cursor-default hover:border-gray-300 transition-colors">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            We are live
          </div>
          
          {/* High Contrast Typography */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1] max-w-5xl mx-auto">
            <span className="text-gray-900">Recruitment OS</span> <br />
            <span className="text-gray-400">for modern teams</span>
          </h1>
          
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
            Track, analyze, and improve your entire hiring pipeline with an AI-powered workflow platform designed for speed.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24">
            {user && session ? (
              <Button 
                variant="black" 
                size="xl" 
                className="h-14 px-8 rounded-full text-base shadow-xl shadow-gray-900/10 hover:shadow-gray-900/20 transition-all"
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
              <Link to="/signup">
                <Button variant="black" size="xl" className="h-14 px-8 rounded-full text-base shadow-xl shadow-gray-900/10 hover:shadow-gray-900/20 transition-all">
                  Start Hiring Now
                </Button>
              </Link>
            )}
            <Button variant="outline" size="xl" className="h-14 px-8 rounded-full text-base bg-white hover:bg-gray-50 border-gray-200" icon={<Play size={16} className="fill-gray-900 text-gray-900"/>}>
              See how it works
            </Button>
          </div>
        </FadeIn>

        {/* Dashboard Preview */}
        <FadeIn delay={200}>
            <div className="relative rounded-t-3xl border-x border-t border-gray-200 bg-white shadow-2xl shadow-gray-200/50 mx-auto max-w-6xl overflow-hidden group">
                {/* Browser Chrome */}
                <div className="h-10 border-b border-gray-100 flex items-center px-4 gap-2 bg-gray-50/50">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="ml-4 flex-1 max-w-lg h-6 bg-white border border-gray-200 rounded-md flex items-center px-3 text-[10px] text-gray-400 shadow-sm">
                        <span className="text-gray-300 mr-2">🔒</span> coreflow.ai/dashboard
                    </div>
                </div>

                {/* Dashboard UI Replica */}
                <div className="flex h-[600px] overflow-hidden bg-white text-left font-sans">
                    
                    {/* Sidebar Replica */}
                    <div className="w-60 bg-white border-r border-gray-200 hidden md:flex flex-col flex-shrink-0">
                        <div className="p-6 mb-2">
                            <Logo size="lg" />
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
                                <Calendar size={16} /> Interviews
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
                    <div className="flex-1 p-8 overflow-hidden flex flex-col gap-8 bg-gray-50/30">
                        {/* Header */}
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back, Alex</h2>
                                <p className="text-sm text-gray-500 mt-1">Here's what's happening in your pipeline today.</p>
                            </div>
                            <div className="flex gap-3 items-center">
                                <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 bg-white">
                                    <Bell size={18} />
                                </div>
                                <div className="bg-black text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg shadow-gray-900/20">
                                    <Plus size={14} /> Post a Job
                                </div>
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-4 gap-4">
                             {[
                                { label: 'Active Jobs', val: '12', trend: '+2', icon: Briefcase },
                                { label: 'Candidates', val: '842', trend: '+15%', icon: Users },
                                { label: 'Interviews', val: '24', trend: '+4', icon: Calendar },
                                { label: 'Time to Fill', val: '18d', trend: '-2d', icon: Clock }
                             ].map((stat, i) => (
                                 <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                     <div className="flex justify-between items-start mb-2">
                                         <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{stat.label}</span>
                                         <div className="p-2 rounded-lg bg-gray-50 text-gray-900 border border-gray-100">
                                            <stat.icon size={16} />
                                         </div>
                                     </div>
                                     <div>
                                         <span className="text-2xl font-bold text-gray-900 block tracking-tight">{stat.val}</span>
                                         <div className="flex items-center gap-1 mt-1">
                                             <span className="text-[10px] font-medium text-green-600">{stat.trend}</span>
                                             <span className="text-[10px] text-gray-400">vs last month</span>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
                            {/* Recruitment Flow */}
                            <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6 flex flex-col shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-gray-900 text-base">Recruitment Flow</h3>
                                    <div className="flex gap-1">
                                        <span className="text-[10px] font-medium px-2 py-0.5 bg-black text-white rounded border border-black">12w</span>
                                        <span className="text-[10px] font-medium px-2 py-0.5 bg-white text-gray-500 rounded border border-gray-200">4w</span>
                                    </div>
                                </div>
                                <div className="flex gap-6 border-b border-gray-100 mb-4">
                                  <div className="pb-2 text-xs font-bold text-gray-900 border-b-2 border-black">New Candidates</div>
                                  <div className="pb-2 text-xs font-medium text-gray-400">Interviews</div>
                                  <div className="pb-2 text-xs font-medium text-gray-400">Offers</div>
                                </div>
                                <div className="flex-1 w-full relative">
                                    {/* SVG Chart Replica */}
                                    <svg viewBox="0 0 600 220" className="w-full h-full overflow-visible preserve-3d">
                                         <defs>
                                            <linearGradient id="chartGradient3" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <path d="M0,180 C50,160 100,170 150,140 C200,110 250,130 300,90 C350,50 400,70 450,40 C500,10 550,30 600,60 V220 H0 Z" fill="url(#chartGradient3)" />
                                        <path d="M0,180 C50,160 100,170 150,140 C200,110 250,130 300,90 C350,50 400,70 450,40 C500,10 550,30 600,60" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                                        
                                        {/* Grid Lines */}
                                        <line x1="0" y1="50" x2="600" y2="50" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4 4" />
                                        <line x1="0" y1="110" x2="600" y2="110" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4 4" />
                                        <line x1="0" y1="170" x2="600" y2="170" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4 4" />
                                    </svg>
                                </div>
                            </div>

                            {/* Quick Actions / Activity */}
                            <div className="col-span-1 flex flex-col gap-4">
                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                    <h3 className="font-bold text-gray-900 text-base mb-4">Quick Actions</h3>
                                    <button className="w-full bg-black text-white rounded-lg py-3.5 px-4 flex items-center justify-center gap-3 text-sm font-bold mb-3 shadow-md hover:bg-gray-800 transition-colors">
                                        <Calendar size={16} /> Schedule Interview
                                    </button>
                                     <button className="w-full bg-white border border-gray-200 text-gray-700 rounded-lg py-3.5 px-4 flex items-center justify-between text-sm font-medium hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3"><Briefcase size={16} className="text-gray-500" /> Bulk Actions</div>
                                        <ChevronDown size={16} />
                                    </button>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex-1 overflow-hidden">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-gray-900 text-base">Activity</h3>
                                    </div>
                                     <div className="space-y-4 relative">
                                        <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-100"></div>
                                        {[
                                            {u: 'Alex', a: 'moved', t: 'Sarah Jenkins', time: '2h ago'},
                                            {u: 'System', a: 'posted', t: 'Prod Designer', time: '4h ago'},
                                            {u: 'Sarah', a: 'rejected', t: 'Mike Ross', time: '1d ago'}
                                        ].map((act, i) => (
                                            <div key={i} className="flex gap-3 relative pl-6">
                                                <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-gray-200 z-10"></div>
                                                <div className="space-y-0.5">
                                                    <p className="text-xs text-gray-900"><span className="font-bold">{act.u}</span> {act.a} <span className="font-medium underline decoration-gray-300">{act.t}</span></p>
                                                    <p className="text-[10px] text-gray-400">{act.time}</p>
                                                </div>
                                            </div>
                                        ))}
                                     </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </FadeIn>
      </section>

      {/* Why Choose CoreFlow */}
      <section id="benefits" className="py-24 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
             <FadeIn>
               <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">Why Choose CoreFlow</h2>
                  <p className="text-gray-500 text-lg">The recruitment platform trusted by leading companies worldwide.</p>
               </div>

               {/* "Problem" Banner */}
               <div className="max-w-3xl mx-auto bg-white border-l-4 border-gray-900 shadow-sm rounded-r-lg p-6 mb-16 flex flex-col md:flex-row items-center text-center md:text-left gap-4">
                  <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">Tired of spending hours on manual resume screening?</p>
                      <p className="text-sm text-gray-500">Frustrated with biased hiring decisions and missing top talent? Stop wasting time and money on inefficient recruitment processes.</p>
                  </div>
               </div>
             </FadeIn>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {[
                    { 
                        title: "Faster Hiring Cycles", 
                        desc: "Automate repetitive tasks and reduce your time-to-hire by up to 60%.",
                        improvement: "60%",
                        points: ["60% faster hiring", "Automated workflows", "Reduced bottlenecks"]
                    },
                    { 
                        title: "AI-Powered Technology", 
                        desc: "Advanced machine learning algorithms that learn and improve with every hire.",
                        improvement: "99.2%",
                        points: ["Continuous learning", "99.2% accuracy", "Real-time insights"]
                    },
                    { 
                        title: "Eliminate Hiring Bias", 
                        desc: "Objective, data-driven hiring decisions that focus purely on qualifications and skills.",
                        improvement: "100%",
                        points: ["Unbiased screening", "Diverse talent pools", "Fair evaluation process"]
                    },
                    { 
                        title: "Cost-Effective Solution", 
                        desc: "Reduce hiring costs by up to 50% while improving candidate quality and retention.",
                        improvement: "50%",
                        points: ["50% cost reduction", "Better ROI", "Higher retention rates"]
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
      <section id="features" className="py-32 max-w-7xl mx-auto px-6">
        <FadeIn>
          <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">Everything you need <br/><span className="text-gray-400">to hire the best.</span></h2>
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
      <section id="pricing" className="py-32 max-w-7xl mx-auto px-6">
        <FadeIn>
          <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-gray-200 bg-white shadow-sm text-xs font-medium text-gray-600 mb-6">
                 <span className="text-gray-400">★</span> Simple, Transparent Pricing
              </div>
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tighter">Choose Your <br/> Perfect Plan</h2>
              <p className="text-gray-500 max-w-xl mx-auto">
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
               <div className="bg-white rounded-[2rem] p-10 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                   <div className="mb-8">
                       <h3 className="text-2xl font-bold text-gray-900 mb-4">Basic Plan</h3>
                       <div className="flex items-baseline gap-1 mb-2">
                           <span className="text-6xl font-bold tracking-tighter text-gray-900">
                               ${billingCycle === 'monthly' ? '39' : '33'}
                           </span>
                           <span className="text-gray-500 font-medium">per month</span>
                       </div>
                   </div>
                   
                   {user && session ? (
                     <Button 
                       variant="outline" 
                       size="lg" 
                       className="w-full mb-10 border-gray-300 text-gray-900 hover:bg-gray-50"
                       onClick={() => handleSubscribe('basic')}
                     >
                       Subscribe Now
                     </Button>
                   ) : (
                     <Link to="/signup">
                       <Button variant="outline" size="lg" className="w-full mb-10 border-gray-300 text-gray-900 hover:bg-gray-50">Start Free Trial</Button>
                     </Link>
                   )}
                   
                   <div className="space-y-6 flex-1">
                       <p className="font-bold text-sm text-gray-900 uppercase tracking-wide">FEATURES</p>
                       <p className="text-sm text-gray-500 mb-4">Perfect for small teams getting started</p>
                       <ul className="space-y-4">
                           {[
                               "Up to 10 active job postings", 
                               "20 candidates per job", 
                               "Unlimited candidate applications", 
                               "AI-powered screening & ranking",
                               "Automated interview scheduling",
                               "Basic analytics dashboard",
                               "Email notifications",
                               "Standard support"
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
               <div className="bg-white rounded-[2rem] p-10 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col relative overflow-hidden">
                   <div className="mb-8">
                       <h3 className="text-2xl font-bold text-gray-900 mb-4">Professional Plan</h3>
                       <div className="flex items-baseline gap-1 mb-2">
                           <span className="text-6xl font-bold tracking-tighter text-gray-900">
                               ${billingCycle === 'monthly' ? '99' : '83'}
                           </span>
                           <span className="text-gray-500 font-medium">per month</span>
                       </div>
                   </div>
                   
                   {user && session ? (
                     <Button 
                       variant="black" 
                       size="lg" 
                       className="w-full mb-10"
                       onClick={() => handleSubscribe('professional')}
                     >
                       Subscribe Now
                     </Button>
                   ) : (
                     <Link to="/signup">
                       <Button variant="black" size="lg" className="w-full mb-10">Start Free Trial</Button>
                     </Link>
                   )}
                   
                   <div className="space-y-6 flex-1">
                       <p className="font-bold text-sm text-gray-900 uppercase tracking-wide">FEATURES</p>
                       <p className="text-sm text-gray-500 mb-4">Advanced features for growing teams</p>
                       <ul className="space-y-4">
                           {[
                               "15 active job postings (can purchase extra slots)", 
                               "100 candidates per job", 
                               "Unlimited candidate applications", 
                               "Advanced AI ranking & auto shortlisting",
                               "Team collaboration (multi-user workspace)",
                               "Interview calendar integration (Google/Outlook)",
                               "Advanced analytics & reports",
                               "Priority chat + email support",
                               "Custom integrations"
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
      <section id="faq" className="py-32 max-w-7xl mx-auto px-6 border-t border-gray-100">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-24">
            {/* Left Header */}
            <div className="lg:col-span-1">
                <h2 className="text-5xl md:text-6xl font-bold text-gray-900 tracking-tighter leading-[0.9] mb-6">
                    Frequently <br/> asked <br/> questions
                </h2>
            </div>

            {/* Right Accordion */}
            <div className="lg:col-span-2 space-y-0">
                {[
                    { q: "What is CoreFlow and how does it work?", a: "CoreFlow is an end-to-end recruitment operating system. It centralizes your job postings, candidates, and interviews into one platform. Simply create an account, post a job, and start tracking candidates through our visual pipeline." },
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
      <footer className="bg-gray-100 pt-24 pb-10 overflow-hidden relative border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 mb-16">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                 <div className="text-gray-400 text-sm">
                     © 2025 CoreFlow AI. All rights reserved.
                 </div>
                 <div className="flex gap-8 text-sm text-gray-500">
                     <Link to="/terms" className="hover:text-gray-900 transition-colors">Terms of Service</Link>
                     <Link to="/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</Link>
                 </div>
             </div>
        </div>

        {/* Giant Text */}
        <div className="w-full flex justify-center border-t border-transparent">
            <h1 className="text-[18vw] font-bold tracking-tighter leading-none text-black select-none text-center">
                coreflow
            </h1>
        </div>
      </footer>
      
      {/* Floating Chat Button (Simulated) */}
      <div className="fixed bottom-8 right-8 z-40">
          <button className="w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
              <MessageSquare className="text-white" size={24} />
          </button>
      </div>
    </div>
  );
};

export default LandingPage;

