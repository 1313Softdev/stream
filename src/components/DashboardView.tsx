import React, { useState, useEffect } from 'react';
import { Radio, AlertCircle, Clock, Video, Plus, ArrowUpRight, Play, CalendarClock, Hourglass } from 'lucide-react';
import { Slot, VideoItem, UserProfile } from '../types';
import { AppView } from './Sidebar';
import { fetchUserTransactions } from '../lib/api';

interface DashboardViewProps {
  slots: Slot[];
  videos: VideoItem[];
  user?: UserProfile;
  onNavigate: (view: AppView) => void;
  onSelectSlot: (slot: Slot) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  slots,
  videos,
  user,
  onNavigate,
  onSelectSlot,
}) => {
  const [pendingTxCount, setPendingTxCount] = useState<number>(0);

  useEffect(() => {
    if (user?.id && user.id !== 'usr_guest') {
      fetchUserTransactions(user.id)
        .then((txs) => {
          const pending = txs.filter(
            (t) => t.status === 'pending' && (!t.slotId || !slots.some((s) => s.id === t.slotId))
          );
          setPendingTxCount(pending.length);
        })
        .catch(() => {});
    }
  }, [user?.id, slots]);

  const activeSlotsCount = slots.filter((s) => s.status === 'active').length;
  const expiredSlotsCount = slots.filter((s) => s.status === 'expired').length;
  const inactiveSlotsCount = slots.filter((s) => s.status === 'inactive').length;
  const pendingSlotsCount = slots.filter(
    (s) => s.status === 'pending_approval' || s.paymentStatus === 'pending'
  ).length;
  const pendingConfirmationCount = pendingSlotsCount + pendingTxCount;
  const streamingSlots = slots.filter((s) => s.streamStatus === 'Live');
  const scheduledSlots = slots.filter((s) => s.streamStatus === 'Scheduled');

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-10">
      {/* Title & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Dashboard
          </h2>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 ml-4">
            <span>App</span>
            <span>&gt;</span>
            <span className="text-[#6320ee] dark:text-[#a855f7]">Dashboard</span>
          </div>
        </div>
      </div>

      {/* Streaming Alert Banner if active */}
      {streamingSlots.length > 0 ? (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                {streamingSlots.length === 1
                  ? `Live Stream in progress: ${streamingSlots[0].name} (${streamingSlots[0].platform})`
                  : `${streamingSlots.length} Simultaneous Live Streams Active:`}
              </span>
              {streamingSlots.length > 1 && (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {streamingSlots.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onSelectSlot(s)}
                      className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-medium hover:underline cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{s.name} ({s.platform})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => onSelectSlot(streamingSlots[0])}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer self-start sm:self-auto shrink-0"
          >
            Open Stream Monitor
          </button>
        </div>
      ) : scheduledSlots.length > 0 ? (
        <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarClock className="w-5 h-5 text-[#6320ee] dark:text-[#a855f7]" />
            <span className="text-sm font-semibold text-purple-900 dark:text-purple-200">
              Upcoming Scheduled Stream: {scheduledSlots[0].name} (Starts {scheduledSlots[0].streamStartTime || 'soon'})
            </span>
          </div>
          <button
            onClick={() => onSelectSlot(scheduledSlots[0])}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#6320ee] hover:bg-[#5218cc] rounded-md transition-colors cursor-pointer"
          >
            View Schedule
          </button>
        </div>
      ) : null}

      {/* Slots Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Slots</h3>
          <span className="text-xs text-slate-400 dark:text-slate-500">Updated just now</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Active Card */}
          <div
            onClick={() => onNavigate('live-slots')}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-400/40 transition-all cursor-pointer group flex items-center gap-5"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 flex items-center justify-center shrink-0">
              <Radio className="w-7 h-7" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {activeSlotsCount}
              </div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Active
              </div>
            </div>
          </div>

          {/* Inactive Card */}
          <div
            onClick={() => onNavigate('live-slots')}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-400/40 transition-all cursor-pointer group flex items-center gap-5"
          >
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {inactiveSlotsCount}
              </div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Inactive
              </div>
            </div>
          </div>

          {/* Expired Card */}
          <div
            onClick={() => onNavigate('live-slots')}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-red-400/40 transition-all cursor-pointer group flex items-center gap-5"
          >
            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center shrink-0">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {expiredSlotsCount}
              </div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Expired
              </div>
            </div>
          </div>

          {/* Pending Confirmation Card */}
          <div
            onClick={() => onNavigate('live-slots')}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-purple-400/40 transition-all cursor-pointer group flex items-center gap-5 relative overflow-hidden"
          >
            <div className="w-14 h-14 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#6320ee] dark:text-[#a855f7] flex items-center justify-center shrink-0 relative">
              <Hourglass className="w-7 h-7" />
              {pendingConfirmationCount > 0 && (
                <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-[#6320ee] border-2 border-white dark:border-slate-900 animate-pulse" />
              )}
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums flex items-center gap-2">
                <span>{pendingConfirmationCount}</span>
                {pendingConfirmationCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-[#6320ee] dark:text-[#a855f7]">
                    Pending
                  </span>
                )}
              </div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Pending Confirmation
              </div>
            </div>
          </div>
        </div>

        {/* Informative Banner if Pending Confirmation > 0 */}
        {pendingConfirmationCount > 0 && (
          <div className="p-4 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-purple-900 dark:text-purple-200">
              <Hourglass className="w-4 h-4 text-[#6320ee] dark:text-[#a855f7] shrink-0" />
              <span>
                <strong>{pendingConfirmationCount} Slot Subscription(s) Pending Confirmation:</strong> Admin is verifying your payment reference (UTR). Your live slot will be created automatically once approved.
              </span>
            </div>
            <button
              onClick={() => onNavigate('live-slots')}
              className="px-3.5 py-1.5 rounded-lg bg-[#6320ee] hover:bg-[#5218cc] text-white font-semibold transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
            >
              Check Slots →
            </button>
          </div>
        )}
      </div>

      {/* Videos Section */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Videos</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div
            onClick={() => onNavigate('videos')}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400/40 transition-all cursor-pointer group flex items-center gap-5"
          >
            <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-500 flex items-center justify-center shrink-0">
              <Video className="w-7 h-7" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {videos.length}
              </div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Videos
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launch & Slot Details shortcut */}
      {slots.length > 0 ? (
        <div
          onClick={() => onSelectSlot(slots[0])}
          className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-[#6320ee]/50 transition-all cursor-pointer group"
          title="Click to open Live Slot Studio"
        >
          <div className="flex flex-col gap-1">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 group-hover:text-[#6320ee] dark:group-hover:text-[#a855f7] transition-colors">
              <span>Primary Slot: {slots[0].name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                slots[0].streamStatus === 'Live' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                Stream {slots[0].streamStatus}
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Expires on {slots[0].expireOn} · Loop: {slots[0].streamLoop ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectSlot(slots[0]);
              }}
              className="px-4 py-2 text-xs font-semibold text-[#6320ee] dark:text-[#a855f7] bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Manage Slot Details</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('billing');
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#6320ee] hover:bg-[#5218cc] rounded-lg transition-colors cursor-pointer"
            >
              Add / Renew Slots
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-purple-500/10 via-[#6320ee]/10 to-indigo-500/10 p-8 rounded-2xl border border-[#6320ee]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 animate-in fade-in">
          <div className="flex flex-col gap-1.5">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-[#6320ee]" />
              <span>No Active Slots Yet</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              To broadcast 24/7 continuous loops on YouTube, Facebook, or Twitch, subscribe to a cloud streaming slot. No free trials — every slot is provisioned on dedicated high-speed cloud infrastructure upon payment approval.
            </p>
          </div>
          <button
            onClick={() => onNavigate('live-slots')}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Get Your First Slot</span>
          </button>
        </div>
      )}
    </div>
  );
};
