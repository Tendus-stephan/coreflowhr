import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PageLoader } from '../components/ui/PageLoader';
import { resolvePostLoginDestination } from '../utils/postLoginRoute';

/**
 * Landing page for Google OAuth (and any other OAuth provider).
 * Supabase redirects here after authentication instead of directly to /dashboard,
 * so we can run subscription/onboarding checks before choosing a destination.
 * Users never see /dashboard flash → /pricing.
 */
const AuthRedirect: React.FC = () => {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (ran.current) return;

    if (!session || !user) {
      navigate('/login', { replace: true });
      return;
    }

    ran.current = true;

    resolvePostLoginDestination(user.id)
      .then((destination) => {
        if (destination === '/dashboard') {
          sessionStorage.setItem('showDashboardLoader', 'true');
        }
        navigate(destination, { replace: true });
      })
      .catch(() => {
        sessionStorage.setItem('showDashboardLoader', 'true');
        navigate('/dashboard', { replace: true });
      });
  }, [loading, session, user, navigate]);

  return <PageLoader />;
};

export default AuthRedirect;
