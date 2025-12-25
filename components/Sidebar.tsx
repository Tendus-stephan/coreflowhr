import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, Calendar, Settings, LogOut, User as UserIcon, FileText } from 'lucide-react';
import { Avatar } from './ui/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('User');

  // Load user profile data
  useEffect(() => {
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
  }, [user, location.pathname]); // Reload when user changes or when navigating (e.g., returning from Settings)

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
    await signOut();
  };

  const userEmail = user?.email || '';

  return (
    <div className="w-64 h-screen bg-white border-r border-border flex flex-col sticky top-0 left-0 shadow-sm z-20">
      <div className="px-6 py-6 flex items-center gap-3 mb-2">
        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-sm">
             <span className="text-lg font-bold font-serif italic">C</span>
        </div>
        <span className="text-lg font-bold text-gray-900 tracking-tight">CoreFlow</span>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={16} className={`transition-colors ${isActive ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-900'}`} />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border relative" ref={profileRef}>
        {/* Profile Button */}
        <div 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors group ${
                isProfileOpen ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
        >
            {user ? (
                <>
                    <Avatar name={userName} src={userAvatar} className="w-8 h-8 text-[10px]" />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-900 group-hover:text-black">{userName}</span>
                        <span className="text-[10px] text-gray-500">{userEmail}</span>
                    </div>
                </>
            ) : (
                <div className="flex items-center gap-3 w-full">
                    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="space-y-1 flex-1">
                        <div className="h-2 w-20 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-2 w-12 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                </div>
            )}
        </div>

        {/* Dropdown Menu */}
        {isProfileOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-30">
                <div className="py-1">
                    <Link 
                        to="/settings" 
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                        <UserIcon size={16} />
                        Profile
                    </Link>
                    <div className="h-px bg-gray-100 my-1"></div>
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                        <LogOut size={16} />
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