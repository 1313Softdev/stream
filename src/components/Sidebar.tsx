import React from 'react';
import {
  LayoutDashboard,
  Radio,
  Video,
  DollarSign,
  User,
  HelpCircle,
  MessageSquare,
  LogOut,
  LogIn,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { PantherLogo } from './PantherLogo';

export type AppView = 'dashboard' | 'live-slots' | 'slot-details' | 'videos' | 'billing' | 'profile' | 'admin';

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenTutorial: () => void;
  onOpenContact: () => void;
  onSwitchToLanding: () => void;
  onLogout: () => void;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  onOpenAuth?: (mode?: 'login' | 'register') => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onOpenTutorial,
  onOpenContact,
  onSwitchToLanding,
  onLogout,
  isAuthenticated,
  isAdmin,
  onOpenAuth,
  isMobileOpen,
  onCloseMobile,
}) => {
  const mainNavItems = [
    { id: 'dashboard' as AppView, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live-slots' as AppView, label: 'Live Slots', icon: Radio },
    { id: 'videos' as AppView, label: 'Videos', icon: Video },
    { id: 'billing' as AppView, label: 'Billing', icon: DollarSign },
    { id: 'profile' as AppView, label: 'Profile', icon: User },
    ...(isAdmin ? [{ id: 'admin' as AppView, label: 'Admin Portal', icon: Shield }] : []),
  ];

  const handleNavClick = (view: AppView) => {
    onNavigate(view);
    onCloseMobile();
  };

  const isCurrentActive = (id: AppView) => {
    if (id === 'live-slots' && currentView === 'slot-details') return true;
    return currentView === id;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & Main Navigation */}
        <div className="p-5 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleNavClick('dashboard')}
              className="text-left cursor-pointer focus:outline-hidden"
            >
              <PantherLogo size={34} />
            </button>
          </div>

          <nav className="flex flex-col gap-1.5">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const active = isCurrentActive(item.id);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer text-left ${
                    active
                      ? 'bg-[#6320ee] text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Navigation & Actions */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-1.5">
          <button
            onClick={() => {
              onOpenTutorial();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left"
          >
            <HelpCircle className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            <span>Tutorial</span>
          </button>

          <button
            onClick={() => {
              onOpenContact();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left"
          >
            <MessageSquare className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            <span>Contact</span>
          </button>

          {isAuthenticated ? (
            <button
              onClick={() => {
                onLogout();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer text-left"
            >
              <LogOut className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              <span>Logout</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (onOpenAuth) onOpenAuth('login');
                onCloseMobile();
              }}
              className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-sm font-medium text-[#6320ee] dark:text-[#a855f7] bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors cursor-pointer text-left"
            >
              <LogIn className="w-5 h-5 text-[#6320ee] dark:text-[#a855f7]" />
              <span className="font-semibold">Sign In / Register</span>
            </button>
          )}

          {/* Quick link to Landing Page */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
            <button
              onClick={() => {
                onSwitchToLanding();
                onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[#6320ee] dark:text-[#a855f7] bg-purple-50 dark:bg-purple-950/40 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors cursor-pointer"
            >
              <span>View Main Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
