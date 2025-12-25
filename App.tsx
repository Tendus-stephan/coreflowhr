import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SourcingProvider } from './contexts/SourcingContext';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import { CandidateSourcingNotification } from './components/CandidateSourcingNotification';
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
import Onboarding from './pages/Onboarding';

const Layout = () => {
  const location = useLocation();
  
  // Pages that don't show the sidebar
  const isStandalonePage = [
    '/', 
    '/login', 
    '/signup', 
    '/forgot-password', 
    '/verify-email'
  ].some(path => location.pathname === path || 
    location.pathname.startsWith('/jobs/apply') || 
    location.pathname.startsWith('/offers/respond'));

  if (isStandalonePage) {
    return <Outlet />;
  }

  return (
    <div className="flex min-h-screen bg-background text-gray-900 font-sans selection:bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden relative">
        <Outlet />
      </main>
      {/* Always visible CoreFlow AI notification */}
      <CandidateSourcingNotification />
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
          path="/offers/respond/:token" 
          element={<OfferResponse />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <SourcingProvider>
          <AppRoutes />
        </SourcingProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;