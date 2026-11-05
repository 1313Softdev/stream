import React, { useState } from 'react';
import { Mail, Shield, Check, X, KeyRound, User as UserIcon, LogOut } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileViewProps {
  user: UserProfile;
  isDark: boolean;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onSetTheme: (theme: 'light' | 'dark') => void;
  onLogout?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  isDark,
  onUpdateUser,
  onSetTheme,
  onLogout,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editCity, setEditCity] = useState(user.city);
  const [editPhone, setEditPhone] = useState(user.phone);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      name: editName,
      email: editEmail,
      city: editCity,
      phone: editPhone,
      avatarInitials: editName.charAt(0).toUpperCase(),
    });
    setShowEditModal(false);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    setPasswordSaved(true);
    setTimeout(() => {
      setPasswordSaved(false);
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
      {/* Title & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Profile
          </h2>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 ml-4">
            <span>App</span>
            <span>&gt;</span>
            <span className="text-[#6320ee] dark:text-[#a855f7]">Profile</span>
          </div>
        </div>
      </div>

      {/* 2-Column Grid matching Screenshot 2 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Card: User Profile info (md:col-span-5) */}
        <div className="md:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs flex flex-col items-center text-center gap-5">
          {/* Large Circle Avatar matching Screenshot 2: Navy blue #004b87 */}
          <div className="w-24 h-24 rounded-full bg-[#004b87] text-white text-4xl font-semibold flex items-center justify-center shadow-sm select-none">
            {user.avatarInitials || user.name.charAt(0)}
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {user.name}
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              ID: {user.id}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>

          <button
            onClick={() => {
              setEditName(user.name);
              setEditEmail(user.email);
              setEditCity(user.city);
              setEditPhone(user.phone);
              setShowEditModal(true);
            }}
            className="w-full py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer mt-2"
          >
            Edit Profile
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full py-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout Account</span>
            </button>
          )}
        </div>

        {/* Right Card: Account Settings (md:col-span-7) */}
        <div className="md:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs flex flex-col gap-8">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Account Settings
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage your account preferences
            </p>
          </div>

          {/* Theme Section matching Screenshot 2 */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Theme
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1.5">
              Choose your preferred theme
            </p>

            <div className="flex flex-col gap-2.5 pt-1">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="radio"
                  name="theme"
                  checked={!isDark}
                  onChange={() => onSetTheme('light')}
                  className="w-4 h-4 text-[#6320ee] focus:ring-[#6320ee] border-slate-300 cursor-pointer accent-[#6320ee]"
                />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Light
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="radio"
                  name="theme"
                  checked={isDark}
                  onChange={() => onSetTheme('dark')}
                  className="w-4 h-4 text-[#6320ee] focus:ring-[#6320ee] border-slate-300 cursor-pointer accent-[#6320ee]"
                />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Dark
                </span>
              </label>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Password Section matching Screenshot 2 */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Password
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1.5">
              Add a password to also sign in with your email and password
            </p>

            <div className="pt-1">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="px-5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
              >
                Add Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Edit Profile
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#6320ee] hover:bg-[#5218cc] rounded-lg shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#6320ee]" />
                <span>Set Account Password</span>
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordSaved ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-emerald-600">
                <Check className="w-10 h-10" />
                <span className="text-sm font-bold">Password set successfully!</span>
              </div>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 8 characters"
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
                    required
                    minLength={6}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#6320ee] hover:bg-[#5218cc] rounded-lg shadow-xs cursor-pointer"
                  >
                    Save Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
