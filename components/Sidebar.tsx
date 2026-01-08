import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, Calendar, Settings, LogOut, User as UserIcon, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar } from './ui/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { api } from '../services/api';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, session, signOut } = useAuth();
  const { isExpanded, setIsExpanded } = useSidebar();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('User');

  // Don't render sidebar if user is not authenticated
  // This check must be AFTER all hooks to maintain hook order
  const isAuthenticated = user && session;

  // Load user profile data
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadProfile = async () => {
      if (user) {
        try {
          const profile = await api.auth.me();
          setUserName(profile.name);
          setUserAvatar(profile.avatar || null);
        } catch (error) {
          console.error('Error loading profile:', error);
          // Fallback to user metadata
          setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'User');
        }
      }
    };
    loadProfile();
    
    // Listen for custom event to refresh profile (dispatched from Settings after save)
    const handleProfileUpdate = () => {
      if (user) {
        loadProfile();
      }
    };
    
    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user, location.pathname, isAuthenticated]); // Reload when user changes or when navigating (e.g., returning from Settings)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Jobs', path: '/jobs', icon: Briefcase },
    { name: 'Candidates', path: '/candidates', icon: Users },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Offers', path: '/offers', icon: FileText },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    // Don't await - signOut handles redirect immediately
    signOut();
  };

  const userEmail = user?.email || '';

  // Don't render sidebar if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`${isExpanded ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 flex flex-col fixed top-0 left-0 bottom-0 shadow-sm z-20 transition-all duration-150`} style={{ overflow: 'hidden' }}>
      <div className={`${isExpanded ? 'px-6' : 'px-4'} ${isExpanded ? 'py-4' : 'py-6'} ${isExpanded ? 'mb-1' : 'mb-2'} flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} flex-shrink-0`}>
        <Link to="/dashboard" className="flex items-center gap-3">
          {isExpanded ? (
            // Full logo when expanded - bigger but not too big
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
          ) : (
            // Favicon logo when collapsed
            <img 
              src="/assets/images/coreflow-favicon-logo.png" 
              alt="CoreFlow" 
              className="object-contain flex-shrink-0"
              style={{ 
                width: '58px',
                height: '58px'
              }}
            />
          )}
        </Link>
        {isExpanded && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            title="Collapse sidebar"
          >
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
        )}
      </div>
      {!isExpanded && (
        <div className="px-4 mb-2 flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            title="Expand sidebar"
          >
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>
      )}

      <nav className={`flex-1 ${isExpanded ? 'px-4' : 'px-2'} space-y-2 overflow-y-auto`} style={{ overflowX: 'hidden' }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center ${isExpanded ? 'gap-3 px-3' : 'justify-center px-2'} py-2.5 rounded-lg transition-all duration-150 group relative ${
                isActive 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={!isExpanded ? item.name : ''}
            >
              <item.icon size={16} className={`transition-colors flex-shrink-0 ${isActive ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-900'}`} />
              {isExpanded && (
                <span className="text-sm font-medium whitespace-nowrap">{item.name}</span>
              )}
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={`${isExpanded ? 'p-4' : 'p-2'} border-t border-gray-200 relative flex-shrink-0 bg-white`} ref={profileRef} style={{ marginTop: 'auto' }}>
        {/* Profile Button */}
        <div 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`flex items-center ${isExpanded ? 'gap-3' : 'justify-center'} p-2 rounded-lg cursor-pointer transition-colors group relative ${
                isProfileOpen ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
            title={!isExpanded ? `${userName} (${userEmail})` : ''}
        >
            {user ? (
                <>
                    <Avatar name={userName} src={userAvatar} className="w-8 h-8 text-[10px] flex-shrink-0" />
                    {isExpanded && (
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-gray-900 group-hover:text-black truncate">{userName}</span>
                            <span className="text-[10px] text-gray-500 truncate">{userEmail}</span>
                        </div>
                    )}
                    {!isExpanded && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                            <div className="font-bold">{userName}</div>
                            <div className="text-[10px]">{userEmail}</div>
                        </div>
                    )}
                </>
            ) : (
                <div className={`flex items-center ${isExpanded ? 'gap-3' : 'justify-center'} w-full`}>
                    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
                    {isExpanded && (
                        <div className="space-y-1 flex-1">
                            <div className="h-2 w-20 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-2 w-12 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Dropdown Menu */}
        {isProfileOpen && (
            <div className={`absolute bottom-full ${isExpanded ? 'left-4 right-4' : 'left-2 right-2'} mb-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-30`}>
                <div className="py-1">
                    <Link 
                        to="/settings" 
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                        <UserIcon size={16} />
                        {isExpanded && <span>Profile</span>}
                    </Link>
                    <div className="h-px bg-gray-100 my-1"></div>
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                        <LogOut size={16} />
                        {isExpanded && <span>Log out</span>}
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;