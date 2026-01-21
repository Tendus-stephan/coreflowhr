import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SourcingProvider } from './contexts/SourcingContext';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import { ModalProvider, useModal } from './contexts/ModalContext';
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

const Layout = () => {
  const location = useLocation();
  const { isExpanded } = useSidebar();
  const { isCandidateModalOpen } = useModal(); // Move this BEFORE any conditional returns
  
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
  ].some(path => location.pathname === path || 
    location.pathname.startsWith('/jobs/apply') || 
    location.pathname.startsWith('/offers/respond') ||
    location.pathname.startsWith('/candidates/register'));

  if (isStandalonePage) {
    return <Outlet />;
  }

  const sidebarWidth = isExpanded ? '256px' : '80px';
  
  // Don't show AI button on onboarding page or when candidate modal is open
  const showAIButton = location.pathname !== '/onboarding' && !isCandidateModalOpen;

  // Show loader if it's a dashboard login
  if (showLoader && location.pathname === '/dashboard') {
    return <CoreLoader />;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-gray-100">
      <Sidebar />
      <main className={`overflow-x-hidden relative transition-all duration-150 bg-white ${isExpanded ? 'md:ml-[256px]' : 'md:ml-[80px]'}`} style={{ paddingBottom: '80px' }}>
        <Outlet />
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

  // For login/signup pages, if already logged in, let ProtectedRoute handle redirect
  return <>{children}</>;
};

// AppRoutes component that uses AuthProvider context
const AppRoutes: React.FC = () => {
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
          path="/forgot-password" 
          element={
            <PublicRoute>
              <ForgotPassword />
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
          path="/onboarding" 
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/candidates" 
          element={
            <ProtectedRoute>
              <CandidateBoard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/jobs" 
          element={
            <ProtectedRoute>
              <Jobs />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/jobs/new" 
          element={
            <ProtectedRoute>
              <AddJob />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/jobs/edit/:id" 
          element={
            <ProtectedRoute>
              <AddJob />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/calendar" 
          element={
            <ProtectedRoute>
              <Calendar />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/offers" 
          element={
            <ProtectedRoute>
              <Offers />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/jobs/apply/:jobId" 
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
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
              <AppRoutes />
            </ModalProvider>
          </SidebarProvider>
        </SourcingProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;