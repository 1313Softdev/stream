import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  Plus,
  RefreshCw,
  Eye,
  Play,
  Square,
  Trash2,
  Radio,
  CalendarClock,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Video as VideoIcon,
  Film,
  Key,
  QrCode,
  ShieldCheck,
  Lock,
  XCircle,
} from 'lucide-react';
import { Slot, VideoItem, StreamingPlatform, BillingPeriod, UserProfile, SubscriptionPlanItem } from '../types';
import { BILLING_PLANS } from '../config/billingPlans';
import { PaymentModal } from './PaymentModal';
import { AppView } from './Sidebar';

interface LiveSlotsViewProps {
  slots: Slot[];
  videos?: VideoItem[];
  user?: UserProfile;
  plans?: SubscriptionPlanItem[];
  onSelectSlot: (slot: Slot) => void;
  onNavigate: (view: AppView) => void;
  onToggleStream: (slotId: string, overrides?: Partial<Slot>) => void;
  onDeleteSlot: (slotId: string) => void;
  onAddSlot: (
    slotName: string,
    scheduleStart?: boolean,
    startTime?: string,
    streamKey?: string,
    videoId?: string,
    platform?: StreamingPlatform,
    planId?: string,
    requireApproval?: boolean
  ) => Slot;
  onRenewSlot?: (slotId: string, period: BillingPeriod, count: number, utr?: string) => void;
  initialPlanPeriod?: BillingPeriod;
}

export const LiveSlotsView: React.FC<LiveSlotsViewProps> = ({
  slots,
  videos = [],
  user,
  plans,
  onSelectSlot,
  onNavigate,
  onToggleStream,
  onDeleteSlot,
  onAddSlot,
  onRenewSlot,
  initialPlanPeriod,
}) => {
  const [filter, setFilter] = useState<string>('All Slots');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(Boolean(initialPlanPeriod));
  const [slotToDelete, setSlotToDelete] = useState<Slot | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newSlotName, setNewSlotName] = useState<string>(`Slot ${Date.now()}`);
  const [newPlatform, setNewPlatform] = useState<StreamingPlatform>('YouTube');
  const [newStreamKey, setNewStreamKey] = useState<string>('');
  const [newVideoId, setNewVideoId] = useState<string>(videos[0]?.id || '');
  const [selectedPlanPeriod, setSelectedPlanPeriod] = useState<BillingPeriod>(initialPlanPeriod || 'Months');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [scheduleNewSlot, setScheduleNewSlot] = useState<boolean>(false);
  const [newSlotStartTime, setNewSlotStartTime] = useState<string>('October 30th, 2026 06:00 PM');

  useEffect(() => {
    if (initialPlanPeriod) {
      setSelectedPlanPeriod(initialPlanPeriod);
      setShowAddModal(true);
    }
  }, [initialPlanPeriod]);

  // Payment Modal state for new slot purchase or slot renewal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentPlanPeriod, setPaymentPlanPeriod] = useState<BillingPeriod>('Months');
  const [paymentSlotId, setPaymentSlotId] = useState<string | undefined>(undefined);
  const [paymentSlotName, setPaymentSlotName] = useState<string>('');

  const activePlans: SubscriptionPlanItem[] = (plans && plans.length > 0)
    ? plans.filter((p) => p.isActive)
    : [
        { id: 'plan_days', title: 'Daily Trial / Event', period: 'Days', durationLabel: '1 Day', durationDays: 1, priceINR: 99, priceUSD: 1.5, storageGB: 1, maxSlots: 1, features: ['24 Hours continuous live streaming', '1GB Dedicated video storage', 'Unlimited loops with zero buffering', '1080p 60fps broadcast quality'], isActive: true, isPopular: false, displayOrder: 1 },
        { id: 'plan_weeks', title: 'Weekly Boost', period: 'Weeks', durationLabel: '1 Week', durationDays: 7, priceINR: 299, priceUSD: 4, storageGB: 3, maxSlots: 1, features: ['7 Days continuous live streaming', '3GB Dedicated video storage', 'Unlimited loops with zero buffering', '1080p 60fps broadcast quality'], isActive: true, isPopular: false, displayOrder: 2 },
        { id: 'plan_months', title: 'Monthly Standard', period: 'Months', durationLabel: '1 Month', durationDays: 30, priceINR: 799, priceUSD: 10, storageGB: 20, maxSlots: 1, features: ['30 Days continuous live streaming', '20GB Dedicated video storage', 'Unlimited loops with zero buffering', '1080p 60fps broadcast quality', 'Multi-slot management'], isActive: true, isPopular: false, displayOrder: 3 },
        { id: 'plan_3months', title: 'Quarterly Supercharged', period: '3 Months', durationLabel: '3 Months', durationDays: 90, priceINR: 1999, priceUSD: 24, storageGB: 50, maxSlots: 1, features: ['90 Days continuous live streaming', '50GB Dedicated video storage', 'Unlimited loops with zero buffering', '1080p 60fps broadcast quality', 'Best Value · Save 30%', '24/7 Dedicated Server Support'], isActive: true, isPopular: true, displayOrder: 4 },
      ];

  const currentPlan = (selectedPlanId && activePlans.find((p) => p.id === selectedPlanId)) ||
                      activePlans.find((p) => p.period === selectedPlanPeriod) ||
                      activePlans[0];
  const activePaymentPlan = activePlans.find((p) => p.id === paymentPlanPeriod || p.period === paymentPlanPeriod) || activePlans[0];

  const filteredSlots = slots.filter((slot) => {
    if (filter === 'All Slots') return true;
    if (filter === 'My Master Slots') return slot.userId === user?.id;
    if (filter === 'User Live Slots') return slot.userId !== user?.id;
    if (filter === 'Active') return slot.status === 'active';
    if (filter === 'Expired') return slot.status === 'expired';
    if (filter === 'Pending Approval') return slot.status === 'pending_approval';
    if (filter === 'Inactive') return slot.status === 'inactive';
    if (filter === 'Live Streams') return slot.streamStatus === 'Live';
    if (filter === 'Scheduled Streams') return slot.streamStatus === 'Scheduled';
    return true;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredSlots.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const getTimeRemaining = (expiresAt?: number): string | null => {
    if (!expiresAt || expiresAt <= Date.now()) return null;
    const diffMs = expiresAt - Date.now();
    const totalMins = Math.floor(diffMs / (60 * 1000));
    const days = Math.floor(totalMins / (24 * 60));
    const hours = Math.floor((totalMins % (24 * 60)) / 60);
    const mins = totalMins % 60;
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCreateSlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotName.trim()) return;

    const isUserAdmin = user?.role === 'admin';

    if (isUserAdmin) {
      // Admin can create and activate slots directly without payment
      onAddSlot(
        newSlotName.trim(),
        scheduleNewSlot,
        newSlotStartTime,
        newStreamKey.trim(),
        newVideoId || videos[0]?.id,
        newPlatform,
        currentPlan.id || selectedPlanPeriod,
        false
      );
      setShowAddModal(false);
      setToastMessage(`Admin created and activated slot "${newSlotName.trim()}".`);
      setTimeout(() => setToastMessage(null), 3500);
    } else {
      // Non-admin user: WITHOUT SUBSCRIPTION PAYMENT DO NOT ADD ANY SLOT!
      // Close modal and proceed directly to payment checkout
      setShowAddModal(false);
      setPaymentSlotId(undefined); // undefined means new slot creation upon admin verification
      setPaymentSlotName(newSlotName.trim());
      setPaymentPlanPeriod(currentPlan.period);
      setIsPaymentModalOpen(true);
    }

    setNewSlotName(`Slot ${Date.now()}`);
    setNewStreamKey('');
    setNewPlatform('YouTube');
    setScheduleNewSlot(false);
  };

  const handleOpenPayment = (slot: Slot) => {
    setPaymentSlotId(slot.id);
    setPaymentSlotName(slot.name);
    setPaymentPlanPeriod((slot.subscriptionPlanId as BillingPeriod) || 'Months');
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (utr: string) => {
    setIsPaymentModalOpen(false);
    if (paymentSlotId && onRenewSlot) {
      onRenewSlot(paymentSlotId, paymentPlanPeriod, 1, utr);
      setToastMessage(`Renewal payment submitted with UTR ${utr}! Once confirmed by admin, your slot validity will be extended.`);
    } else {
      setToastMessage(`Subscription payment submitted with UTR ${utr}! Once confirmed by admin, your usable live slot will be created automatically.`);
    }
    setTimeout(() => setToastMessage(null), 6000);
    setPaymentSlotId(undefined);
    setPaymentSlotName('');
  };

  const handleConfirmDeleteSlot = () => {
    if (!slotToDelete) return;
    const name = slotToDelete.name;
    onDeleteSlot(slotToDelete.id);
    setToastMessage(`Slot "${name}" was deleted.`);
    setTimeout(() => setToastMessage(null), 3500);
    setSlotToDelete(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Title & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Live Slots
          </h2>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 ml-4">
            <span>App</span>
            <span>&gt;</span>
            <span className="text-[#6320ee] dark:text-[#a855f7]">Live Slots</span>
          </div>
        </div>
      </div>

      {/* Admin Master Banner */}
      {user?.role === 'admin' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white dark:from-purple-950/40 dark:via-indigo-950/20 dark:to-slate-900 border border-purple-200 dark:border-purple-800/60 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6320ee] text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Admin Master Slot Control</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-purple-600 text-white">Full Access</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                You have master privileges to monitor, start, stop, or configure any live streaming slot across all platform users.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('admin')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors shrink-0 cursor-pointer"
          >
            Admin Control Center &rarr;
          </button>
        </div>
      )}

      {/* Heading & Subtitle matching Screenshot 6 */}
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
          Stream Your Prerecorded Video Now
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Just upload video, and boom! <span className="text-[#6320ee] dark:text-[#a855f7] font-semibold">Go Live</span> anywhere any time
        </p>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Dropdown */}
        <div className="relative inline-block w-64">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium py-2.5 px-3.5 pr-8 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#6320ee] cursor-pointer"
          >
            <option value="All Slots">All Slots ({slots.length})</option>
            {user?.role === 'admin' && (
              <>
                <option value="My Master Slots">★ My Master Slots ({slots.filter((s) => s.userId === user?.id).length})</option>
                <option value="User Live Slots">User Live Slots ({slots.filter((s) => s.userId !== user?.id).length})</option>
              </>
            )}
            <option value="Active">Active ({slots.filter((s) => s.status === 'active').length})</option>
            <option value="Pending Approval">Pending Approval ({slots.filter((s) => s.status === 'pending_approval').length})</option>
            <option value="Live Streams">Live Streams ({slots.filter((s) => s.streamStatus === 'Live').length})</option>
            <option value="Scheduled Streams">Scheduled Streams</option>
            <option value="Expired">Expired</option>
            <option value="Inactive">Inactive</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-[#6320ee] hover:bg-[#5218cc] rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Slot</span>
          </button>
          <button
            onClick={() => onNavigate('billing')}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Renew Slots</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <th className="py-4 px-5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredSlots.length > 0 && selectedIds.length === filteredSlots.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-[#6320ee] focus:ring-[#6320ee] cursor-pointer"
                  />
                </th>
                <th className="py-4 px-6">SLOT NAME</th>
                <th className="py-4 px-6">VIDEO</th>
                <th className="py-4 px-6">DESTINATION</th>
                <th className="py-4 px-6">STREAM</th>
                <th className="py-4 px-6">EXPIRE ON</th>
                <th className="py-4 px-6 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredSlots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    No slots found matching the criteria. Click "Add Slot" to create one.
                  </td>
                </tr>
              ) : (
                filteredSlots.map((slot) => {
                  const isChecked = selectedIds.includes(slot.id);
                  const isStreaming = slot.streamStatus === 'Live';
                  const isPendingApproval = slot.status === 'pending_approval';
                  const isExpired = slot.status === 'expired' || (Boolean(slot.expiresAt) && slot.expiresAt! > 0 && slot.expiresAt! < Date.now());
                  const slotVideo = videos.find((v) => v.id === slot.videoId) || videos[0];

                  return (
                    <tr
                      key={slot.id}
                      onClick={() => onSelectSlot(slot)}
                      className="hover:bg-purple-50/30 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                      title="Click anywhere on row to open Live Slot Studio"
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectRow(slot.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[#6320ee] focus:ring-[#6320ee] cursor-pointer"
                        />
                      </td>

                      {/* Slot Name */}
                      <td className="py-4 px-6">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSlot(slot);
                          }}
                          className="font-bold text-slate-900 dark:text-white group-hover:text-[#6320ee] dark:group-hover:text-[#a855f7] cursor-pointer transition-colors text-left flex items-center gap-1.5"
                        >
                          <span>{slot.name}</span>
                        </button>
                        <div className="flex items-center gap-2 mt-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectSlot(slot);
                            }}
                            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-mono cursor-pointer"
                          >
                            ID: {slot.id}
                          </button>
                          {user?.role === 'admin' && slot.userId && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              slot.userId === user?.id
                                ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}>
                              {slot.userId === user?.id ? '★ Admin Slot' : `User: ${slot.userId.slice(-6)}`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Video */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2.5 max-w-[200px]">
                          {slotVideo?.thumbnailUrl ? (
                            <img
                              src={slotVideo.thumbnailUrl}
                              alt=""
                              className="w-10 h-7 rounded object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-7 rounded bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0">
                              <Film className="w-3.5 h-3.5 text-[#6320ee]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate block">
                              {slotVideo?.title || 'Default Stream Video'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {slotVideo?.duration || '15s Loop'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Destination & Key */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Radio className="w-3 h-3 text-[#6320ee]" />
                            <span>{slot.platform || 'YouTube'}</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                            <Key className="w-2.5 h-2.5" />
                            {slot.streamKey ? `${slot.streamKey.slice(0, 4)}••••${slot.streamKey.slice(-4)}` : <span className="text-amber-500 font-sans">No key set</span>}
                          </span>
                        </div>
                      </td>

                      {/* Stream */}
                      <td className="py-4 px-6">
                        {isPendingApproval ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 font-semibold text-xs">
                            <Lock className="w-3 h-3" />
                            <span>Pending Payment</span>
                          </span>
                        ) : isExpired ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-semibold text-xs">
                              <XCircle className="w-3 h-3" />
                              <span>Expired</span>
                            </span>
                            {slot.expiresAt ? (
                              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-medium">
                                Auto-delete in {Math.max(1, 15 - Math.floor((Date.now() - slot.expiresAt) / (24 * 3600 * 1000)))}d
                              </span>
                            ) : null}
                          </div>
                        ) : isStreaming ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            LIVE
                          </span>
                        ) : slot.streamStatus === 'Scheduled' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-[#6320ee] dark:text-[#a855f7] font-semibold text-xs">
                            <CalendarClock className="w-3 h-3 animate-pulse" />
                            <span>Scheduled</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 font-medium text-xs">
                            Off
                          </span>
                        )}
                      </td>

                      {/* Expire On */}
                      <td className="py-4 px-6 text-slate-600 dark:text-slate-400 text-xs tabular-nums">
                        {isPendingApproval ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">Pending Approval</span>
                        ) : isExpired ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="line-through text-red-500/80 dark:text-red-400/80">{slot.expireOn || 'Expired'}</span>
                            {slot.expiresAt ? (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">
                                Purge: in {Math.max(1, 15 - Math.floor((Date.now() - slot.expiresAt) / (24 * 3600 * 1000)))} day{Math.max(1, 15 - Math.floor((Date.now() - slot.expiresAt) / (24 * 3600 * 1000))) === 1 ? '' : 's'}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span>{slot.expireOn}</span>
                            {getTimeRemaining(slot.expiresAt) && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>{getTimeRemaining(slot.expiresAt)}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {/* Direct Live Slot Studio Button */}
                          <button
                            type="button"
                            onClick={() => onSelectSlot(slot)}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-[#6320ee] hover:text-white dark:bg-purple-950/60 dark:hover:bg-[#6320ee] text-[#6320ee] dark:text-[#a855f7] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                            title="Open slot in Live Studio"
                          >
                            <Radio className="w-3.5 h-3.5" />
                            <span>Studio</span>
                          </button>

                          {isPendingApproval ? (
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(slot)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                              title="Submit or View Payment UTR for this slot"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Pay / UTR</span>
                            </button>
                          ) : isExpired ? (
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(slot)}
                              className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                              title="Renew subscription for this slot"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Renew</span>
                            </button>
                          ) : (
                            <>
                              {/* Quick Stream toggle */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (!slot.streamKey?.trim() && !isStreaming) {
                                    onSelectSlot(slot);
                                    setToastMessage('Please paste the stream key for this slot before starting.');
                                    setTimeout(() => setToastMessage(null), 3500);
                                    return;
                                  }
                                  onToggleStream(slot.id);
                                }}
                                className={`p-2 rounded-lg transition-all cursor-pointer shadow-2xs ${
                                  isStreaming
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : slot.streamStatus === 'Scheduled'
                                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                                    : 'bg-[#6320ee] text-white hover:bg-[#5218cc]'
                                }`}
                                title={isStreaming ? "Stop Live Stream" : slot.streamStatus === 'Scheduled' ? "Launch Scheduled Stream Now" : "Start Live Stream with this slot's key & video"}
                              >
                                {isStreaming ? (
                                  <Square className="w-3.5 h-3.5 fill-current" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                )}
                              </button>

                              {/* Renew Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenPayment(slot)}
                                className="p-2 text-slate-500 hover:text-[#6320ee] dark:hover:text-[#a855f7] rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
                                title="Renew or Extend Subscription"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setSlotToDelete(slot)}
                            className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Delete Slot"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Slot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header (Pinned at Top) */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Add New Live Slot
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Create a dedicated 24/7 cloud streaming slot for your videos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body (flex-1 min-h-0 ensures scrollbar appears) */}
            <form
              id="add-live-slot-form"
              onSubmit={handleCreateSlotSubmit}
              className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-4 overscroll-contain"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Slot Name
                </label>
                <input
                  type="text"
                  value={newSlotName}
                  onChange={(e) => setNewSlotName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
                  placeholder="e.g. YouTube Live 2 (Gaming)"
                  required
                />
              </div>

              {/* Platform Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Streaming Platform
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['YouTube', 'Facebook', 'Twitch', 'Custom RTMP'] as StreamingPlatform[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPlatform(p)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        newPlatform === p
                          ? 'border-[#6320ee] bg-purple-50 dark:bg-purple-950/40 text-[#6320ee] dark:text-[#a855f7]'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Radio className="w-3 h-3" />
                      <span>{p}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stream Key */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Stream Key for this Slot
                </label>
                <input
                  type="text"
                  value={newStreamKey}
                  onChange={(e) => setNewStreamKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
                  placeholder="Paste stream key (xxxx-xxxx-xxxx-xxxx-xxxx)"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Each slot can have its own unique stream key to broadcast to different channels or live events simultaneously.
                </span>
              </div>

              {/* Video Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Video to Broadcast
                </label>
                <select
                  value={newVideoId}
                  onChange={(e) => setNewVideoId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
                >
                  {videos.length === 0 ? (
                    <option value="">Default: 24/7 Lo-Fi Stream Video</option>
                  ) : (
                    videos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title} ({v.duration || 'Loop'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Schedule Stream Start option in modal */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-[#6320ee]" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Schedule Stream Start
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={scheduleNewSlot}
                    onChange={(e) => setScheduleNewSlot(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#6320ee] focus:ring-[#6320ee] cursor-pointer"
                  />
                </div>

                {scheduleNewSlot && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-slate-500">
                      Start Date & Time:
                    </label>
                    <input
                      type="text"
                      value={newSlotStartTime}
                      onChange={(e) => setNewSlotStartTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                      placeholder="October 30th, 2026 06:00 PM"
                    />
                  </div>
                )}
              </div>

              {/* Subscription Plan Period Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Subscription Plan Duration*
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {activePlans.map((plan) => {
                    const isSelected = currentPlan.id === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          setSelectedPlanId(plan.id);
                          setSelectedPlanPeriod(plan.period);
                        }}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#6320ee] bg-purple-50/80 dark:bg-purple-950/40 ring-2 ring-[#6320ee]/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                          {plan.durationLabel || `${plan.durationDays} Days`}
                        </span>
                        <span className="text-xs font-extrabold text-[#6320ee] dark:text-[#a855f7]">
                          ₹{plan.priceINR}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                          {plan.title.replace('Plan', '').trim()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {user?.role !== 'admin' && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">Payment & Approval Required:</span>
                    <span>New slots are provisioned after payment approval. You will submit UPI reference in the next step.</span>
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 text-xs text-[#6320ee] dark:text-[#a855f7] flex flex-col gap-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span>Included in this {currentPlan.durationLabel || `${currentPlan.durationDays} Days`} slot:</span>
                  <span className="text-xs font-extrabold text-[#6320ee] dark:text-[#a855f7]">₹{currentPlan.priceINR}</span>
                </div>
                <div className="flex flex-col gap-1 text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">
                  {currentPlan.features && currentPlan.features.length > 0 ? (
                    currentPlan.features.map((feat, idx) => (
                      <span key={idx} className="flex items-center gap-1.5">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>{feat}</span>
                      </span>
                    ))
                  ) : (
                    <>
                      <span className="flex items-center gap-1.5">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>24/7 Automated stream server ({currentPlan.durationLabel || `${currentPlan.durationDays} Days`})</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>Unlimited loops with zero buffering</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>{currentPlan.storageGB || 4}GB Dedicated cloud video storage</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </form>

            {/* Modal Sticky Footer (Pinned at Bottom) */}
            <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-800/80 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-live-slot-form"
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] rounded-lg shadow-sm cursor-pointer transition-colors"
              >
                {user?.role === 'admin' ? 'Create & Activate Slot' : `Proceed to Pay ₹${currentPlan.priceINR}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Slot In-App Confirmation Modal */}
      {slotToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5 my-auto">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 stroke-2" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Delete Live Slot?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Are you sure you want to delete this live slot?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {slotToDelete.name}
                </span>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                  {slotToDelete.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>Expires: {slotToDelete.expireOn}</span>
                <span>·</span>
                <span>Platform: {slotToDelete.platform}</span>
              </div>
            </div>

            {slots.length <= 1 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Notice: This is your only active slot. You can add more slots anytime.</span>
              </div>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Deleting this slot will immediately terminate any ongoing broadcast and release the allocated 24/7 cloud server.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSlotToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSlot}
                className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Slot</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment & UTR Submission Modal */}
      {isPaymentModalOpen && user && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPaymentSlotId(undefined);
            setPaymentSlotName('');
          }}
          planTitle={`${activePaymentPlan.title} (${activePaymentPlan.durationLabel || activePaymentPlan.period})${paymentSlotName ? ` - ${paymentSlotName}` : ''}`}
          planId={activePaymentPlan.id || paymentPlanPeriod}
          slotId={paymentSlotId}
          slotName={paymentSlotName}
          amount={activePaymentPlan.priceINR}
          currency="INR"
          user={user}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};
