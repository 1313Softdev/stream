import React from 'react';
import { Moon, Sun, Menu, Globe, Database, LogIn, UserPlus, LogOut, Check, Shield } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  title: string;
  user: UserProfile;
  isDark: boolean;
  isRealtimeConnected: boolean;
  isAuthenticated: boolean;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
  onToggleTheme: () => void;
  onOpenMobileMenu: () => void;
  onNavigateToProfile: () => void;
  onNavigateToAdmin?: () => void;
  onSwitchToLanding: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  user,
  isDark,
  isRealtimeConnected,
  isAuthenticated,
  onOpenAuth,
  onLogout,
  onToggleTheme,
  onOpenMobileMenu,
  onNavigateToProfile,
  onNavigateToAdmin,
  onSwitchToLanding,
}) => {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between transition-colors">
      {/* Left: Mobile menu button & Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>

          {/* MySQL Database Sync Indicator */}
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              isRealtimeConnected
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
            }`}
            title={isRealtimeConnected ? 'Connected to MySQL Backend Database' : 'Connecting to MySQL database...'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="font-mono">MySQL Backend</span>
          </div>
        </div>
      </div>

      {/* Right: Landing page switch, Admin portal, Theme Toggle, User Display & Logout */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {isAuthenticated && user?.role === 'admin' && onNavigateToAdmin && (
          <button
            onClick={onNavigateToAdmin}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#6320ee] dark:text-[#a855f7] bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
            title="Open Admin Dashboard"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        )}

        <button
          onClick={onSwitchToLanding}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-[#6320ee] dark:hover:text-[#a855f7] border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Switch to public StreamAdda home page"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Home Page</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* User Info, Avatar & Logout */}
        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800">
          <button
            onClick={onNavigateToProfile}
            className="flex items-center gap-2.5 group cursor-pointer text-left py-1 px-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="View profile settings"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#004b87] text-white font-semibold text-xs sm:text-sm flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs group-hover:scale-105 transition-transform shrink-0">
              {user.avatarInitials || (user.name ? user.name.charAt(0) : 'U')}
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#6320ee] dark:group-hover:text-[#a855f7] transition-colors leading-tight">
                {user.name ? user.name.split(' ')[0] : 'User'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium capitalize">
                {user.role || 'user'}
              </span>
            </div>
          </button>

          {isAuthenticated ? (
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Log out of account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#6320ee]" />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-[#6320ee] hover:bg-[#5218cc] rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
