import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { PageLoader } from './components/ui/PageLoader';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SourcingProvider } from './contexts/SourcingContext';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import { ModalProvider, useModal } from './contexts/ModalContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { DevToastTester } from './components/DevToastTester';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import { AIAssistantMenu } from './components/AIAssistantMenu';
import { CoreLoader } from './components/CoreLoader';
import Dashboard from './pages/Dashboard';
import CandidateBoard from './pages/CandidateBoard';
import Jobs from './pages/Jobs';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import AddJob from './pages/AddJob';
import Settings from './pages/Settings';
import JobApplication from './pages/JobApplication';
import Calendar from './pages/Calendar';
import Offers from './pages/Offers';
import OfferResponse from './pages/OfferResponse';
import CandidateRegister from './pages/CandidateRegister';
import Onboarding from './pages/Onboarding';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Clients from './pages/Clients';
import ChangeEmail from './pages/ChangeEmail';
import Invite from './pages/Invite';
import AuthRedirect from './pages/AuthRedirect';
import WorkspaceLapsed from './pages/WorkspaceLapsed';
import CareerPage from './pages/CareerPage';
import OfferApproval from './pages/OfferApproval';

// Shows the PageLoader for one paint frame then hands off to the real page.
// This ensures every route change shows the spinner before the page data loads.
const NavLoader: React.FC<{ onMount: () => void }> = ({ onMount }) => {
  useEffect(() => {
    // Use two rAF so the spinner is actually painted before we swap back
    const id = requestAnimationFrame(() => requestAnimationFrame(onMount));
    return () => cancelAnimationFrame(id);
  }, [onMount]);
  return <PageLoader />;
};

const Layout = () => {
  const location = useLocation();
  const { session, user, loading: authLoading } = useAuth();
  const { isCandidateModalOpen } = useModal(); // Move this BEFORE any conditional returns

  // Route-transition loader — shows in content area, sidebar stays visible
  const [navigating, setNavigating] = useState(false);
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      prevPathRef.current = location.pathname;
      setNavigating(true);
    }
  }, [location.pathname]);
  // Hide the nav loader once the new page's own content has rendered
  const hideNavLoader = () => setNavigating(false);

  // Check sessionStorage synchronously to avoid flash - use function initializer
  const [showLoader, setShowLoader] = useState(() => {
    if (location.pathname === '/dashboard') {
      const shouldShow = sessionStorage.getItem('showDashboardLoader') === 'true';
      if (shouldShow) {
        sessionStorage.removeItem('showDashboardLoader');
        return true;
      }
    }
    return false;
  });

  // Check sessionStorage when route changes to /dashboard
  useEffect(() => {
    if (location.pathname === '/dashboard') {
      const shouldShow = sessionStorage.getItem('showDashboardLoader') === 'true';
      if (shouldShow) {
        sessionStorage.removeItem('showDashboardLoader');
        setShowLoader(true);
      }
    } else {
      // Hide loader if navigating away from dashboard
      if (showLoader) {
        setShowLoader(false);
      }
    }
  }, [location.pathname]);

  // Listen for dashboard loading completion to hide loader
  useEffect(() => {
    if (!showLoader) return;

    const handleDashboardLoaded = () => {
      // Wait a bit for smooth transition
      setTimeout(() => {
        setShowLoader(false);
      }, 300);
    };

    // Add timeout fallback to prevent loader from getting stuck (max 10 seconds)
    const timeoutId = setTimeout(() => {
      console.warn('Dashboard loader timeout - hiding loader');
      setShowLoader(false);
    }, 10000);

    window.addEventListener('dashboardLoaded', handleDashboardLoaded);
    
    return () => {
      window.removeEventListener('dashboardLoaded', handleDashboardLoaded);
      clearTimeout(timeoutId);
    };
  }, [showLoader]);

  // Pages that don't show the sidebar
  const isStandalonePage = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/verify-email',
    '/terms',
    '/privacy',
    '/onboarding',
    '/change-email',
    '/auth/redirect',
    '/workspace-lapsed',
  ].some(path => location.pathname === path ||
    location.pathname.startsWith('/jobs/apply') ||
    location.pathname.startsWith('/offers/respond') ||
    location.pathname.startsWith('/offers/approve') ||
    location.pathname.startsWith('/careers/') ||
    location.pathname.startsWith('/candidates/register') ||
    location.pathname.startsWith('/invite'));

  if (isStandalonePage) {
    return <Outlet />;
  }

  // Don't render the sidebar until auth is confirmed. Unauthenticated users who
  // navigate directly to a protected URL would otherwise see the sidebar flash.
  if (authLoading || !session || !user) {
    return <Outlet />;
  }

  // Don't show AI button on onboarding page or when candidate modal is open
  const showAIButton = location.pathname !== '/onboarding' && !isCandidateModalOpen;

  // Show loader if it's a dashboard login
  if (showLoader && location.pathname === '/dashboard') {
    return <CoreLoader />;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-gray-100">
      <Sidebar />
      <main className="overflow-x-hidden relative bg-white md:ml-[240px]" style={{ paddingBottom: '80px' }}>
        {navigating ? (
          <NavLoader onMount={hideNavLoader} />
        ) : (
          <Outlet />
        )}
      </main>
      {/* CoreFlow AI notification - hidden on onboarding */}
      {showAIButton && <AIAssistantMenu />}
    </div>
  );
};

// Public route - allow access to login/signup if not authenticated
// Must be defined inside AuthProvider context
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Allow verify-email page even if logged in (users need to verify)
  if (location.pathname === '/verify-email') {
    return <>{children}</>;
  }

  // Already authenticated with a confirmed session — route them correctly.
  // /auth/redirect runs subscription + onboarding checks before picking a destination.
  if (user && session) {
    return <Navigate to="/auth/redirect" replace />;
  }

  return <>{children}</>;
};

// Detect email-change confirmation redirect from Supabase and send user to settings page
function isEmailChangeConfirmationHash(hash: string): boolean {
  if (!hash || !hash.includes('message=')) return false;
  try {
    const decoded = decodeURIComponent(hash);
    return (
      decoded.includes('link+accepted') ||
      decoded.includes('link accepted') ||
      (decoded.includes('Confirmation') && decoded.includes('other email'))
    );
  } catch {
    return hash.includes('link+accepted') || hash.includes('Confirmation');
  }
}

// Supabase can redirect with error= in hash when link expired/invalid
function isEmailChangeErrorHash(hash: string): boolean {
  return !!(hash && (hash.includes('error=') || hash.includes('error_code=')));
}

// AppRoutes component that uses AuthProvider context
const AppRoutes: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // When user lands on / with email-change hash (success or error), redirect to settings page.
  useEffect(() => {
    const hash = window.location.hash || '';
    const pathname = window.location.pathname || '/';
    const isRoot = pathname === '/' || pathname === '';
    if (!isRoot) return;
    if (isEmailChangeConfirmationHash(hash) || isEmailChangeErrorHash(hash)) {
      const base = window.location.origin;
      window.location.replace(`${base}/settings${hash}`);
    }
  }, [location.pathname]);

  // After login/signup, if there is a stored workspace invite token that is still valid, redirect to /invite once.
  // If the user has already been sent to /invite and then left (e.g. went to landing), do NOT redirect again — clear token and let them stay.
  // Do not run when on verify-email so the user can stay on confirm-email after signup.
  const INVITE_REDIRECT_DONE_KEY = 'inviteRedirectDone';
  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (location.pathname.startsWith('/invite')) return;
    if (location.pathname === '/verify-email') return;

    let cancelled = false;
    try {
      const stored = localStorage.getItem('workspaceInviteToken');
      if (!stored) return;

      // If we already sent them to invite this session and they navigated away, stop pushing them back
      if (sessionStorage.getItem(INVITE_REDIRECT_DONE_KEY) === '1') {
        localStorage.removeItem('workspaceInviteToken');
        sessionStorage.removeItem(INVITE_REDIRECT_DONE_KEY);
        return;
      }

      import('./services/api').then(({ api }) => {
        Promise.race([
          api.workspaces.getInviteByToken(stored),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]).then((r) => {
          if (cancelled) return;
          try {
            if (!r.found) {
              localStorage.removeItem('workspaceInviteToken');
              sessionStorage.removeItem(INVITE_REDIRECT_DONE_KEY);
              return;
            }
            // Don't redirect if invite was for a different email — they'd just see "Wrong account" and get stuck
            const inviteEmail = (r.email || '').trim().toLowerCase();
            const currentEmail = (user?.email || '').trim().toLowerCase();
            if (inviteEmail && currentEmail && inviteEmail !== currentEmail) {
              localStorage.removeItem('workspaceInviteToken');
              sessionStorage.removeItem(INVITE_REDIRECT_DONE_KEY);
              return;
            }
            sessionStorage.setItem(INVITE_REDIRECT_DONE_KEY, '1');
            navigate(`/invite?token=${encodeURIComponent(stored)}`, { replace: true });
          } catch {
            // ignore
          }
        }).catch(() => {
          if (!cancelled) {
            try {
              localStorage.removeItem('workspaceInviteToken');
              sessionStorage.removeItem(INVITE_REDIRECT_DONE_KEY);
            } catch {
              // ignore
            }
          }
        });
      }).catch(() => { /* ignore import errors */ });
    } catch {
      // ignore storage errors
    }
    return () => { cancelled = true; };
  }, [user?.id, loading, location.pathname, navigate]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <SignUp />
            </PublicRoute>
          } 
        />
        <Route 
          path="/verify-email" 
          element={
            <PublicRoute>
              <VerifyEmail />
            </PublicRoute>
          } 
        />
        <Route 
          path="/terms" 
          element={<TermsOfService />}
        />
        <Route 
          path="/privacy" 
          element={<PrivacyPolicy />}
        />
        <Route
          path="/invite"
          element={<Invite />}
        />
        <Route
          path="/workspace-lapsed"
          element={<WorkspaceLapsed />}
        />
        {/* Single shared ProtectedRoute — DB access check runs once per session */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding"    element={<Onboarding />} />
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/candidates"    element={<CandidateBoard />} />
          <Route path="/jobs"          element={<Jobs />} />
          <Route path="/jobs/new"      element={<AddJob />} />
          <Route path="/jobs/edit/:id" element={<AddJob />} />
          <Route path="/settings"      element={<Settings />} />
          <Route path="/calendar"      element={<Calendar />} />
          <Route path="/offers"        element={<Offers />} />
          <Route path="/clients"       element={<Clients />} />
        </Route>
        <Route path="/change-email" element={<ChangeEmail />} />
<Route
          path="/jobs/apply/:jobId"
          element={<JobApplication />}
        />
        <Route
          path="/jobs/apply/:workspaceSlug/:jobSlug"
          element={<JobApplication />}
        />
        <Route 
          path="/candidates/register/:candidateId" 
          element={<CandidateRegister />}
        />
        <Route
          path="/offers/respond/:token"
          element={<OfferResponse />}
        />
        <Route
          path="/offers/approve/:token"
          element={<OfferApproval />}
        />
        <Route
          path="/careers/:workspaceSlug"
          element={<CareerPage />}
        />
        <Route path="/auth/redirect" element={<AuthRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
    </Routes>
  );
};

const App: React.FC = () => {
  // Dev-only Sentry test: visit the app with ?sentryTest=1 to trigger an error
  useEffect(() => {
    if (import.meta.env.DEV && window.location.search.includes('sentryTest=1')) {
      throw new Error('Sentry frontend test error');
    }
  }, []);

  return (
    <Router>
      <AuthProvider>
        <SourcingProvider>
          <SidebarProvider>
            <ModalProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <AppRoutes />
                  <DevToastTester />
                </ConfirmProvider>
              </ToastProvider>
            </ModalProvider>
          </SidebarProvider>
        </SourcingProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;