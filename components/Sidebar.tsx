import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, Users, Calendar,
  Settings, LogOut, User as UserIcon, FileText, Building2,
} from 'lucide-react';
import { Avatar } from './ui/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { supabase } from '../services/supabase';

// Map notification types to nav paths
const NAV_TYPE_MAP: Record<string, string> = {
  candidate_added: '/candidates',
  cv_parsed: '/candidates',
  candidate_graded: '/candidates',
  candidate_moved: '/candidates',
  new_application: '/jobs',
  job_status_update: '/jobs',
  assessment_completed: '/jobs',
  recruitment_reminder: '/jobs',
  job_expired: '/jobs',
  sourcing_complete: '/jobs',
  sourcing_failed: '/jobs',
  interview_scheduled: '/calendar',
  interview_cancelled: '/calendar',
  interview_reminder: '/calendar',
  interview_feedback_reminder: '/calendar',
  offer_accepted: '/offers',
  offer_declined: '/offers',
  counter_offer_received: '/offers',
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, session, signOut } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

  const roleLabel = userRole === 'HiringManager' ? 'Hiring Manager' : userRole;
  const isAuthenticated = user && session;

  useEffect(() => {
    if (!isAuthenticated) return;
    const loadProfile = async () => {
      try {
        const profile = await api.auth.me();
        setUserName(profile.name);
        setUserAvatar(profile.avatar || null);
        setUserEmail(profile.email || user?.email || '');
        setUserRole(profile.role || '');
        setProfileLoaded(true);
      } catch {
        setUserName(user?.user_metadata?.name || user?.email?.split('@')[0] || 'User');
        setUserEmail(user?.email || '');
        setProfileLoaded(true);
      }
      try {
        const ws = await api.workspaces.getWorkspaceWithMembers();
        setWorkspaceName(ws.name || '');
      } catch { /* non-fatal */ }
    };
    loadProfile();
    const handleProfileUpdate = () => loadProfile();
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [user]);

  // Notification badges: subscribe to unread counts per nav section
  useEffect(() => {
    if (!user?.id) return;

    const fetchBadges = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('type')
        .eq('user_id', user.id)
        .eq('unread', true);

      const counts: Record<string, number> = {};
      for (const n of data || []) {
        const path = NAV_TYPE_MAP[n.type as string];
        if (path) counts[path] = (counts[path] || 0) + 1;
      }
      setBadgeCounts(counts);
    };

    fetchBadges();

    const channel = supabase
      .channel(`sidebar-notifs-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, fetchBadges)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Auto-clear badges when navigating to a page
  useEffect(() => {
    if (!user?.id) return;
    const typesForPath = Object.entries(NAV_TYPE_MAP)
      .filter(([, path]) => path === location.pathname)
      .map(([type]) => type);
    if (typesForPath.length === 0) return;

    supabase.from('notifications')
      .update({ unread: false })
      .eq('user_id', user.id)
      .in('type', typesForPath)
      .eq('unread', true)
      .then(() => {
        setBadgeCounts(prev => {
          const next = { ...prev };
          delete next[location.pathname];
          return next;
        });
      });
  }, [location.pathname, user?.id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const mainNav = userRole === 'Viewer'
    ? [
        { name: 'Dashboard',  path: '/dashboard',  icon: LayoutDashboard },
        { name: 'Candidates', path: '/candidates',  icon: Users },
      ]
    : [
        { name: 'Dashboard',  path: '/dashboard',  icon: LayoutDashboard },
        { name: 'Jobs',       path: '/jobs',        icon: Briefcase },
        { name: 'Candidates', path: '/candidates',  icon: Users },
        { name: 'Clients',    path: '/clients',     icon: Building2 },
        { name: 'Calendar',   path: '/calendar',    icon: Calendar },
        ...(!profileLoaded || userRole !== 'HiringManager'
          ? [{ name: 'Offers', path: '/offers', icon: FileText }]
          : []),
      ];

  if (!isAuthenticated) return null;

  const NavLink = ({ item }: { item: { name: string; path: string; icon: React.ElementType } }) => {
    const isActive = location.pathname === item.path ||
      (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
    const count = badgeCounts[item.path] || 0;
    return (
      <Link
        to={item.path}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-100 ${
          isActive
            ? 'bg-gray-100/80 text-gray-900'
            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/50'
        }`}
      >
        <item.icon
          size={14}
          className={`flex-shrink-0 ${isActive ? 'text-gray-900' : 'text-gray-400'}`}
        />
        <span className="flex-1">{item.name}</span>
        {count > 0 && (
          <span className="flex-shrink-0 min-w-[18px] h-[18px] flex items-center justify-center bg-blue-500 text-white text-[10px] font-bold rounded-full px-1 leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="w-[240px] bg-gray-50 border-r border-gray-200 flex flex-col fixed top-0 left-0 bottom-0 z-20 hidden md:flex select-none">

      {/* Logo */}
      <div className="px-5 pt-6 pb-3 flex-shrink-0">
        <Link to="/dashboard" className="flex items-center gap-1.5">
          <img
            src="/assets/images/coreflow-favicon-logo.png"
            alt="CoreFlowHR"
            style={{ width: '36px', height: '36px', display: 'block', objectFit: 'contain', flexShrink: 0 }}
          />
          <span className="text-[15px] font-bold text-gray-900 tracking-tight">CoreflowHR</span>
        </Link>
      </div>

      {/* Workspace */}
      {workspaceName && (
        <div className="px-3 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2 bg-white border border-gray-200 rounded-lg">
            <div className="w-5 h-5 rounded bg-gray-900 flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-bold text-white">{workspaceName.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-[12.5px] font-medium text-gray-700 truncate">{workspaceName}</span>
          </div>
        </div>
      )}

      {/* Main Nav */}
      <nav className="flex-1 px-3 overflow-y-auto overflow-x-hidden">
        <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest px-3 mb-1.5 mt-1">Menu</p>
        <div className="space-y-0.5">
          {mainNav.map(item => <NavLink key={item.path} item={item} />)}
        </div>
      </nav>

      {/* Settings — separated at bottom */}
      <div className="px-3 pb-2 flex-shrink-0">
        <div className="h-px bg-gray-200 mb-2" />
        <NavLink item={{ name: 'Settings', path: '/settings', icon: Settings }} />
      </div>

      {/* Profile */}
      <div className="px-3 pb-3 border-t border-gray-200 pt-2 relative flex-shrink-0" ref={profileRef}>
        <div
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
            isProfileOpen ? 'bg-gray-100' : 'hover:bg-gray-100/60'
          }`}
        >
          <Avatar
            name={userName || user?.email?.split('@')[0] || '…'}
            src={userAvatar}
            className="w-8 h-8 text-[11px] flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            {!profileLoaded ? (
              <div className="h-2.5 w-20 bg-gray-200 rounded animate-pulse" />
            ) : (
              <>
                <p className="text-[13px] font-semibold text-gray-900 truncate leading-none">
                  {userName || 'User'}
                </p>
                {userRole && (
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{roleLabel}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Dropdown */}
        {isProfileOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl z-30">
            <div className="py-1">
              <div className="px-3 py-2.5 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-900 truncate">{userName || 'User'}</p>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">{userEmail || user?.email || ''}</p>
              </div>
              <Link
                to="/settings"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <UserIcon size={14} /> Profile & Settings
              </Link>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors text-left"
              >
                <LogOut size={14} /> Log out
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Sidebar;
