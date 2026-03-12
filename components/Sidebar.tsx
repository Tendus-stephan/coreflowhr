import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, Calendar, Settings, LogOut, User as UserIcon, FileText, Building2, BarChart3 } from 'lucide-react';
import { Avatar } from './ui/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

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
    };
    loadProfile();
    const handleProfileUpdate = () => loadProfile();
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [user]); // only reload when user identity changes, not on every navigation

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navItems = userRole === 'Viewer'
    ? [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Settings',  path: '/settings',  icon: Settings },
      ]
    : [
        { name: 'Dashboard',  path: '/dashboard',  icon: LayoutDashboard },
        { name: 'Jobs',       path: '/jobs',        icon: Briefcase },
        { name: 'Candidates', path: '/candidates',  icon: Users },
        { name: 'Clients',    path: '/clients',     icon: Building2 },
        { name: 'Calendar',   path: '/calendar',    icon: Calendar },
        { name: 'Reports',    path: '/reports',     icon: BarChart3 },
        ...(!profileLoaded || userRole !== 'HiringManager'
          ? [{ name: 'Offers', path: '/offers', icon: FileText }]
          : []),
        { name: 'Settings',   path: '/settings',   icon: Settings },
      ];

  if (!isAuthenticated) return null;

  return (
    <div className="w-[220px] bg-white border-r border-gray-100 flex flex-col fixed top-0 left-0 bottom-0 z-20 hidden md:flex select-none">

      {/* Logo */}
      <div className="px-4 pt-5 pb-4 flex-shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <img
            src="/assets/images/coreflow-favicon-logo.png"
            alt="CoreFlow"
            className="w-6 h-6 object-contain flex-shrink-0"
          />
          <span className="text-sm font-semibold text-gray-900 tracking-tight">CoreFlow</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-100 ${
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <item.icon
                size={14}
                className={`flex-shrink-0 transition-colors ${isActive ? 'text-gray-900' : 'text-gray-400'}`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="p-2 border-t border-gray-100 relative flex-shrink-0" ref={profileRef}>
        <div
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
            isProfileOpen ? 'bg-gray-100' : 'hover:bg-gray-50'
          }`}
        >
          <Avatar
            name={userName || user?.email?.split('@')[0] || '…'}
            src={userAvatar}
            className="w-6 h-6 text-[9px] flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            {!profileLoaded ? (
              <div className="h-2.5 w-20 bg-gray-100 rounded animate-pulse" />
            ) : (
              <>
                <p className="text-[13px] font-medium text-gray-900 truncate leading-none">
                  {userName || 'User'}
                </p>
                {userRole && (
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">{roleLabel}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Dropdown */}
        {isProfileOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl z-30">
            <div className="py-1">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-900 truncate">{userName || 'User'}</p>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">{userEmail || user?.email || ''}</p>
              </div>
              <Link
                to="/settings"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-[13px] text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <UserIcon size={13} />
                Profile & Settings
              </Link>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-left"
              >
                <LogOut size={13} />
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
