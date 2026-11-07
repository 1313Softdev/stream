import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit2,
  Shield,
  CreditCard,
  QrCode,
  HardDrive,
  FolderSync,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Save,
  Check,
  RefreshCw,
  AlertCircle,
  Eye,
  Settings,
  Layers,
  FileVideo,
  Smartphone,
  Copy,
  Tag,
  Radio,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import {
  UserProfile,
  SubscriptionPlanItem,
  PaymentGatewayConfig,
  PaymentTransaction,
  SiteMetaSettings,
  GoogleDriveItem,
  Slot,
  VideoItem,
} from '../types';
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  fetchAdminSettings,
  saveAdminSettings,
  fetchAdminPlans,
  createAdminPlan,
  updateAdminPlan,
  deleteAdminPlan,
  fetchAdminPaymentGateways,
  saveAdminPaymentGateway,
  fetchAdminTransactions,
  verifyAdminTransaction,
  simulateAutoVerifyUtr,
  fetchGDriveStatus,
  fetchGDriveFiles,
  importGDriveVideo,
  testGDriveConnection,
} from '../lib/api';

type AdminTab =
  | 'overview'
  | 'users'
  | 'seo'
  | 'plans'
  | 'gateways'
  | 'utr-desk'
  | 'space'
  | 'gdrive';

interface AdminDashboardViewProps {
  currentUser: UserProfile;
  slots: Slot[];
  videos: VideoItem[];
  onNavigateToSlots?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  slots,
  videos,
  onNavigateToSlots,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Users State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [newUserQuotaGB, setNewUserQuotaGB] = useState(10);

  // 2. Settings & SEO State
  const [settings, setSettings] = useState<SiteMetaSettings>({
    site_title: 'Stream LIVE - 24/7 Cloud Live Streaming for Creators',
    meta_description: 'Stream your Pre-Recorded videos 24x7 nonstop to YouTube, Facebook, Twitch with cloud RTMP servers.',
    meta_keywords: 'live streaming, 24/7 stream, youtube live, rtmp streaming',
    og_image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
    canonical_url: 'https://streamadda.com',
    custom_head_scripts: '',
    default_storage_quota_gb: '10',
    google_drive_enabled: 'false',
    google_drive_folder_id: '',
    google_drive_api_key: '',
    default_payment_gateway: 'upi',
  });

  // 3. Plans State
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanItem | null>(null);
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState<Partial<SubscriptionPlanItem>>({
    title: '',
    period: 'Months',
    durationLabel: '1 Month',
    durationDays: 30,
    priceINR: 1999,
    priceUSD: 24.99,
    storageGB: 10,
    maxSlots: 1,
    features: ['24/7 Cloud Streaming', '1080p 60fps', 'Scheduler'],
    isActive: true,
    isPopular: false,
    displayOrder: 1,
  });

  // 4. Gateways State
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>([]);
  const [activeGatewayId, setActiveGatewayId] = useState<string>('upi');
  const [gatewayForm, setGatewayForm] = useState<Partial<PaymentGatewayConfig>>({});

  // 5. UTR Transactions State
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [txFilter, setTxFilter] = useState<string>('all');
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // 6. Google Drive State
  const [gdriveStatus, setGdriveStatus] = useState<{ enabled: boolean; folderId: string; hasApiKey: boolean; isReady: boolean }>({
    enabled: false,
    folderId: '',
    hasApiKey: false,
    isReady: false,
  });
  const [gdriveFiles, setGdriveFiles] = useState<GoogleDriveItem[]>([]);
  const [isTestingGDrive, setIsTestingGDrive] = useState(false);
  const [selectedSlotForGDrive, setSelectedSlotForGDrive] = useState<string>(slots[0]?.id || '');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Initial Load
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [u, s, p, gw, tx, gd] = await Promise.all([
        fetchAdminUsers().catch(() => []),
        fetchAdminSettings().catch(() => ({})),
        fetchAdminPlans().catch(() => []),
        fetchAdminPaymentGateways().catch(() => []),
        fetchAdminTransactions().catch(() => []),
        fetchGDriveStatus().catch(() => ({ enabled: false, folderId: '', hasApiKey: false, isReady: false })),
      ]);

      setUsers(u);
      setSettings((prev) => ({ ...prev, ...s }));
      setPlans(p);
      setGateways(gw);
      if (gw.length > 0 && !gatewayForm.id) {
        const upiGw = gw.find((g) => g.id === 'upi') || gw[0];
        setActiveGatewayId(upiGw.id);
        setGatewayForm(upiGw);
      }
      setTransactions(tx);
      setGdriveStatus(gd);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch Gateway tab
  const handleSelectGateway = (id: string) => {
    setActiveGatewayId(id);
    const target = gateways.find((g) => g.id === id);
    if (target) setGatewayForm(target);
  };

  // Save Settings / SEO
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveAdminSettings(settings);
      showToast('Settings & Meta tags saved successfully!');
      // Update DOM head dynamically
      if (settings.site_title) document.title = settings.site_title;
    } catch (err: any) {
      alert(err.message);
    }
  };

  // User Actions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createAdminUser({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        storageQuotaGB: newUserQuotaGB,
      });
      setUsers([created, ...users]);
      setIsAddUserOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      showToast(`User ${created.name} created successfully!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const updated = await updateAdminUser(editingUser.id, editingUser);
      setUsers(users.map((u) => (u.id === updated.id ? updated : u)));
      setEditingUser(null);
      showToast(`User ${updated.name} updated successfully!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to permanently delete user "${userName}"?`)) {
      try {
        await deleteAdminUser(userId);
        setUsers(users.filter((u) => u.id !== userId));
        showToast(`User ${userName} deleted.`);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Plan Actions
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        const updated = await updateAdminPlan(editingPlan.id, planForm);
        setPlans(plans.map((p) => (p.id === updated.id ? updated : p)));
        setEditingPlan(null);
        showToast(`Plan ${updated.title} updated!`);
      } else {
        const created = await createAdminPlan(planForm);
        setPlans([...plans, created]);
        setIsAddPlanOpen(false);
        showToast(`Plan ${created.title} created!`);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeletePlan = async (id: string, title: string) => {
    if (confirm(`Delete subscription plan "${title}"?`)) {
      try {
        await deleteAdminPlan(id);
        setPlans(plans.filter((p) => p.id !== id));
        showToast(`Plan "${title}" deleted.`);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Gateway Actions
  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await saveAdminPaymentGateway(activeGatewayId, gatewayForm);
      setGateways(gateways.map((g) => (g.id === saved.id ? saved : g)));
      showToast(`Gateway ${saved.name} configuration saved!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // UTR Desk Actions
  const handleVerifyTx = async (id: string, status: 'approved' | 'rejected') => {
    const note = status === 'approved' ? 'Approved by Admin' : prompt('Enter rejection reason:') || 'Invalid UTR';
    try {
      const updated = await verifyAdminTransaction(id, status, note);
      setTransactions(transactions.map((t) => (t.id === updated.id ? updated : t)));
      showToast(`Transaction ${status.toUpperCase()}! Slot provisioned.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSimulateAutoVerify = async () => {
    try {
      const res = await simulateAutoVerifyUtr();
      setTransactions(transactions.map((t) => (t.id === res.transaction.id ? res.transaction : t)));
      showToast(res.message);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Google Drive Actions
  const handleToggleGDrive = async (enabled: boolean) => {
    const updatedSettings = { ...settings, google_drive_enabled: enabled ? 'true' : 'false' };
    setSettings(updatedSettings);
    await saveAdminSettings(updatedSettings);
    setGdriveStatus((prev) => ({ ...prev, enabled }));
    showToast(`Google Drive master integration is now ${enabled ? 'ENABLED' : 'DISABLED'}`);
  };

  const handleLoadGDriveFiles = async () => {
    try {
      const files = await fetchGDriveFiles(settings.google_drive_folder_id);
      setGdriveFiles(files);
      showToast(`Fetched ${files.length} items from Google Drive.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleImportGDriveVideo = async (file: GoogleDriveItem) => {
    try {
      const res = await importGDriveVideo({
        name: file.name,
        downloadUrl: file.downloadUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        slotId: selectedSlotForGDrive,
      });
      showToast(res.message);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTestGDriveConnection = async () => {
    setIsTestingGDrive(true);
    try {
      const res = await testGDriveConnection(settings.google_drive_api_key || '', settings.google_drive_folder_id);
      alert(res.message);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsTestingGDrive(false);
    }
  };

  // Metrics
  const totalRevenue = transactions
    .filter((t) => t.status === 'approved')
    .reduce((acc, t) => acc + (t.amount || 0), 0);
  const pendingTransactionsCount = transactions.filter((t) => t.status === 'pending').length;
  const activeStreamsCount = slots.filter((s) => s.streamStatus === 'Live').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-semibold animate-slideUp">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#6320ee] via-[#5218cc] to-[#3a0ca3] text-white p-6 sm:p-8 rounded-3xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Admin Control Center
              </h2>
              <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                Super Admin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-purple-100 mt-1">
              Comprehensive platform management: Users, Meta Tags, Plans, Gateways, UTR Verification & Google Drive.
            </p>
          </div>
        </div>

        <button
          onClick={loadAllData}
          disabled={isLoading}
          className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold flex items-center gap-2 backdrop-blur-md transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
        {[
          { id: 'overview' as AdminTab, label: 'Overview', icon: BarChart3 },
          { id: 'users' as AdminTab, label: `Users (${users.length})`, icon: Users },
          { id: 'seo' as AdminTab, label: 'Meta Tags & SEO', icon: Tag },
          { id: 'plans' as AdminTab, label: 'Subscription Plans', icon: Layers },
          { id: 'gateways' as AdminTab, label: 'Payment Gateways', icon: CreditCard },
          {
            id: 'utr-desk' as AdminTab,
            label: `UTR Desk ${pendingTransactionsCount > 0 ? `(${pendingTransactionsCount})` : ''}`,
            icon: QrCode,
            badge: pendingTransactionsCount,
          },
          { id: 'space' as AdminTab, label: 'Storage Setup', icon: HardDrive },
          { id: 'gdrive' as AdminTab, label: 'Google Drive', icon: FolderSync },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-[#6320ee] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {Boolean(tab.badge && tab.badge > 0) && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-8">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500">Registered Users</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{users.length}</span>
                <span className="text-[11px] text-emerald-500 mt-1">MySQL Database synced</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500">Active Live Streams</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{activeStreamsCount}</span>
                <span className="text-[11px] text-purple-600 dark:text-purple-400 mt-1">24x7 RTMP Ingest active</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-[#6320ee] flex items-center justify-center">
                <Radio className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500">Pending UTR Payments</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{pendingTransactionsCount}</span>
                <span className="text-[11px] text-amber-500 mt-1">Awaiting admin review</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500">Approved Revenue</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">₹{totalRevenue}.00</span>
                <span className="text-[11px] text-emerald-500 mt-1">From UPI & Gateways</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Admin Quick Operations</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => { setActiveTab('users'); setIsAddUserOpen(true); }}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex flex-col gap-1 transition-all cursor-pointer"
              >
                <Users className="w-5 h-5 text-[#6320ee]" />
                <span className="text-xs font-bold text-slate-900 dark:text-white mt-1">Add New User</span>
                <span className="text-[11px] text-slate-400">Custom space & password</span>
              </button>

              <button
                onClick={() => setActiveTab('utr-desk')}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex flex-col gap-1 transition-all cursor-pointer"
              >
                <QrCode className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white mt-1">Review UTRs</span>
                <span className="text-[11px] text-slate-400">{pendingTransactionsCount} pending requests</span>
              </button>

              <button
                onClick={() => setActiveTab('plans')}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex flex-col gap-1 transition-all cursor-pointer"
              >
                <Layers className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white mt-1">Edit Pricing Plans</span>
                <span className="text-[11px] text-slate-400">{plans.length} active plans</span>
              </button>

              <button
                onClick={() => setActiveTab('gdrive')}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex flex-col gap-1 transition-all cursor-pointer"
              >
                <FolderSync className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white mt-1">Google Drive Movies</span>
                <span className="text-[11px] text-slate-400">{gdriveStatus.enabled ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Search & Filter */}
            <div className="flex items-center gap-3 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user by name or email..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value as any)}
                className="py-2 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admins only</option>
                <option value="user">Regular Users</option>
              </select>
            </div>

            <button
              onClick={() => setIsAddUserOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create User</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Storage Quota</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {users
                    .filter((u) => {
                      const matchesSearch =
                        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.email.toLowerCase().includes(userSearch.toLowerCase());
                      const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
                      return matchesSearch && matchesRole;
                    })
                    .map((user) => {
                      const quotaGB = ((user.storageQuotaBytes || 10737418240) / (1024 * 1024 * 1024)).toFixed(0);
                      return (
                        <tr key={user.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 text-[#6320ee] dark:text-[#a855f7] font-bold text-xs flex items-center justify-center">
                                {user.avatarInitials}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 dark:text-white">{user.name}</span>
                                <span className="text-[11px] text-slate-400 font-mono">{user.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                user.role === 'admin'
                                  ? 'bg-purple-100 dark:bg-purple-950/60 text-[#6320ee] dark:text-[#a855f7] border border-purple-200 dark:border-purple-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {user.role || 'user'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                user.status === 'suspended'
                                  ? 'bg-red-50 text-red-600 border border-red-200'
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              }`}
                            >
                              {user.status || 'active'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-900 dark:text-white">{quotaGB} GB</span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-500">
                            {user.city ? `${user.city}, ${user.country}` : user.country || 'India'}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => setEditingUser(user)}
                                className="p-1.5 text-slate-400 hover:text-[#6320ee] rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Edit User"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.name)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal: Create User */}
          {isAddUserOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Create New User</h4>
                  <button onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleCreateUser} className="flex flex-col gap-3 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">Full Name*</label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Email Address*</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="e.g. john@example.com"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Password (min 6 characters)*</label>
                    <input
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Role</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                      >
                        <option value="user">Regular User</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Storage Quota (GB)</label>
                      <input
                        type="number"
                        value={newUserQuotaGB}
                        onChange={(e) => setNewUserQuotaGB(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                        min={1}
                        max={1000}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] mt-2 cursor-pointer shadow-xs"
                  >
                    Save User
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Edit User */}
          {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Edit User: {editingUser.name}</h4>
                  <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleUpdateUser} className="flex flex-col gap-3 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Email</label>
                    <input
                      type="email"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Role</label>
                      <select
                        value={editingUser.role || 'user'}
                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Status</label>
                      <select
                        value={editingUser.status || 'active'}
                        onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="banned">Banned</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Custom Storage Quota (GB)</label>
                    <input
                      type="number"
                      value={((editingUser.storageQuotaBytes || 10737418240) / (1024 * 1024 * 1024)).toFixed(0)}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          storageQuotaBytes: Number(e.target.value) * 1024 * 1024 * 1024,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] mt-2 cursor-pointer shadow-xs"
                  >
                    Save Changes
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: META TAGS & SEO */}
      {activeTab === 'seo' && (
        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              SEO & Social Meta Tags
            </h3>
            <p className="text-xs text-slate-500">
              Customize title tags, descriptions, keywords, and OpenGraph tags to dominate search engines.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Site Title (Title Tag)
              </label>
              <input
                type="text"
                value={settings.site_title || ''}
                onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border rounded-xl"
                placeholder="Stream LIVE - 24/7 Cloud Live Streaming"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Meta Description (Search Snippet)
              </label>
              <textarea
                rows={3}
                value={settings.meta_description || ''}
                onChange={(e) => setSettings({ ...settings, meta_description: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border rounded-xl"
                placeholder="Stream your Pre-Recorded videos 24x7 nonstop..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Meta Keywords (Comma separated)
              </label>
              <input
                type="text"
                value={settings.meta_keywords || ''}
                onChange={(e) => setSettings({ ...settings, meta_keywords: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border rounded-xl"
                placeholder="live streaming, 24/7 stream, youtube live"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Canonical URL
                </label>
                <input
                  type="url"
                  value={settings.canonical_url || ''}
                  onChange={(e) => setSettings({ ...settings, canonical_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border rounded-xl"
                  placeholder="https://streamadda.com"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  OpenGraph Image URL (Social Share)
                </label>
                <input
                  type="url"
                  value={settings.og_image || ''}
                  onChange={(e) => setSettings({ ...settings, og_image: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border rounded-xl"
                  placeholder="https://example.com/og-image.jpg"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Custom Header Scripts (Google Analytics / GTM / Pixel)
              </label>
              <textarea
                rows={4}
                value={settings.custom_head_scripts || ''}
                onChange={(e) => setSettings({ ...settings, custom_head_scripts: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-800/60 border rounded-xl"
                placeholder="<script async src='https://www.googletagmanager.com/gtag/js?id=G-XXXXX'></script>"
              />
            </div>

            <button
              type="submit"
              className="py-3 rounded-xl text-xs font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md mt-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Meta Tags & SEO</span>
            </button>
          </div>

          {/* Right Column: Google Search Result Preview */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Google Search Preview
              </span>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col gap-1">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
                  {settings.canonical_url || 'https://streamadda.com'}
                </span>
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer truncate">
                  {settings.site_title || 'Stream LIVE'}
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                  {settings.meta_description || 'Stream your Pre-Recorded videos 24x7 nonstop...'}
                </p>
              </div>
            </div>

            {settings.og_image && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Social Share Card Preview
                </span>
                <img
                  src={settings.og_image}
                  alt="OG Preview"
                  className="w-full h-32 object-cover rounded-xl border border-slate-200"
                />
              </div>
            )}
          </div>
        </form>
      )}

      {/* TAB 4: SUBSCRIPTION PLANS MANAGEMENT */}
      {activeTab === 'plans' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Subscription Plans Customization
              </h3>
              <p className="text-xs text-slate-500">
                Configure prices in INR & USD, durations, storage quotas, and features visible to users.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingPlan(null);
                setPlanForm({
                  title: '',
                  period: 'Months',
                  durationLabel: '1 Month',
                  durationDays: 30,
                  priceINR: 1999,
                  priceUSD: 24.99,
                  storageGB: 10,
                  maxSlots: 1,
                  features: ['24/7 Cloud Streaming', '1080p 60fps'],
                  isActive: true,
                  isPopular: false,
                  displayOrder: plans.length + 1,
                });
                setIsAddPlanOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Plan</span>
            </button>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`p-6 rounded-2xl border bg-white dark:bg-slate-900 flex flex-col justify-between gap-5 relative shadow-xs ${
                  plan.isPopular ? 'border-[#6320ee] ring-2 ring-[#6320ee]/20' : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {plan.isPopular && (
                  <span className="absolute -top-3 left-6 bg-[#6320ee] text-white text-[10px] font-extrabold uppercase py-0.5 px-2.5 rounded-full">
                    {plan.badgeText || 'Popular'}
                  </span>
                )}

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">{plan.title}</h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        plan.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {plan.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      ₹{plan.priceINR}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">(${plan.priceUSD} USD)</span>
                    <span className="text-xs text-slate-400">/ {plan.durationLabel}</span>
                  </div>

                  <div className="text-xs font-medium text-[#6320ee] dark:text-[#a855f7] bg-purple-50 dark:bg-purple-950/40 p-2 rounded-lg">
                    {plan.storageGB} GB Cloud Storage • {plan.maxSlots} Slot(s)
                  </div>

                  <ul className="flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-300 pt-2">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setEditingPlan(plan);
                      setPlanForm(plan);
                      setIsAddPlanOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.id, plan.title)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Modal: Add/Edit Plan */}
          {isAddPlanOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingPlan ? 'Edit Plan' : 'Create Subscription Plan'}
                  </h4>
                  <button onClick={() => setIsAddPlanOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSavePlan} className="flex flex-col gap-3 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">Plan Title*</label>
                    <input
                      type="text"
                      value={planForm.title || ''}
                      onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                      placeholder="e.g. 1 Month Creator"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Period Type</label>
                      <select
                        value={planForm.period || 'Months'}
                        onChange={(e) => setPlanForm({ ...planForm, period: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                      >
                        <option value="Days">Days</option>
                        <option value="Weeks">Weeks</option>
                        <option value="Months">Months</option>
                        <option value="3 Months">3 Months</option>
                        <option value="Year">Year</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Duration Days</label>
                      <input
                        type="number"
                        value={planForm.durationDays || 30}
                        onChange={(e) => setPlanForm({ ...planForm, durationDays: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Price INR (₹)*</label>
                      <input
                        type="number"
                        value={planForm.priceINR ?? 1999}
                        onChange={(e) => setPlanForm({ ...planForm, priceINR: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Price USD ($)*</label>
                      <input
                        type="number"
                        step="0.01"
                        value={planForm.priceUSD ?? 24.99}
                        onChange={(e) => setPlanForm({ ...planForm, priceUSD: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Storage Quota (GB)</label>
                      <input
                        type="number"
                        value={planForm.storageGB ?? 10}
                        onChange={(e) => setPlanForm({ ...planForm, storageGB: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Max Concurrent Slots</label>
                      <input
                        type="number"
                        value={planForm.maxSlots ?? 1}
                        onChange={(e) => setPlanForm({ ...planForm, maxSlots: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Features (one per line)</label>
                    <textarea
                      rows={3}
                      value={(planForm.features || []).join('\n')}
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          features: e.target.value.split('\n').filter((f) => f.trim().length > 0),
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                    />
                  </div>

                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.isActive ?? true}
                        onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                      />
                      <span>Active Plan</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.isPopular ?? false}
                        onChange={(e) => setPlanForm({ ...planForm, isPopular: e.target.checked })}
                      />
                      <span>Highlight as Popular</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] mt-2 cursor-pointer shadow-xs"
                  >
                    Save Plan
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PAYMENT GATEWAYS CONFIGURATION */}
      {activeTab === 'gateways' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Gateway Selector */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
              Payment Gateways
            </span>
            {gateways.map((gw) => (
              <button
                key={gw.id}
                onClick={() => handleSelectGateway(gw.id)}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  activeGatewayId === gw.id
                    ? 'border-[#6320ee] bg-purple-50/50 dark:bg-purple-950/30 text-[#6320ee] dark:text-[#a855f7] font-bold shadow-xs'
                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {gw.id === 'upi' ? <QrCode className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                  <span>{gw.name}</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    gw.isEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {gw.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </button>
            ))}
          </div>

          {/* Right Gateway Configuration Form */}
          <form
            onSubmit={handleSaveGateway}
            className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-5"
          >
            <div className="flex items-center justify-between border-b pb-4 border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Configure {gatewayForm.name || activeGatewayId.toUpperCase()}
                </h3>
                <p className="text-xs text-slate-500">
                  Manage mode, API keys, merchant IDs, and automated verification rules.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gatewayForm.isEnabled ?? false}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, isEnabled: e.target.checked })}
                  className="w-4 h-4 text-[#6320ee] rounded"
                />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Enable Gateway</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1">Gateway Display Name</label>
                <input
                  type="text"
                  value={gatewayForm.name || ''}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Operating Mode</label>
                <select
                  value={gatewayForm.mode || 'manual'}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, mode: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
                >
                  <option value="manual">Manual (User submits UTR/Receipt)</option>
                  <option value="automatic">Automatic (API Webhook / Key fill)</option>
                </select>
              </div>
            </div>

            {/* UPI Specific Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1">Merchant UPI VPA / ID</label>
                <input
                  type="text"
                  value={gatewayForm.upiId || ''}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, upiId: e.target.value })}
                  placeholder="e.g. streamadda@upi"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Merchant Payee Name</label>
                <input
                  type="text"
                  value={gatewayForm.merchantName || ''}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, merchantName: e.target.value })}
                  placeholder="e.g. Stream LIVE Services"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>
            </div>

            {/* API Keys */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1">API Key / Merchant ID (Optional)</label>
                <input
                  type="text"
                  value={gatewayForm.apiKey || ''}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, apiKey: e.target.value })}
                  placeholder="rzp_live_xxx / Mid"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">API Secret / Webhook Secret</label>
                <input
                  type="password"
                  value={gatewayForm.apiSecret || ''}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, apiSecret: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Verification Rule */}
            <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Automatic Verification on Submission
                </span>
                <span className="text-[11px] text-slate-500">
                  When enabled, valid UTR submissions will be auto-approved and slot provisioned immediately.
                </span>
              </div>
              <input
                type="checkbox"
                checked={gatewayForm.autoVerify ?? false}
                onChange={(e) => setGatewayForm({ ...gatewayForm, autoVerify: e.target.checked })}
                className="w-4 h-4 text-[#6320ee] rounded"
              />
            </div>

            {/* Dynamic QR Code Preview */}
            {gatewayForm.upiId && (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=${gatewayForm.upiId}&pn=${encodeURIComponent(gatewayForm.merchantName || 'Stream LIVE')}&cu=INR`)}`}
                  alt="Dynamic QR"
                  className="w-20 h-20 rounded-lg bg-white p-1"
                />
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">Dynamic UPI QR Preview</span>
                  <span className="text-slate-500 text-[11px]">
                    Auto-embeds amount and merchant VPA for Google Pay, PhonePe, Paytm scans.
                  </span>
                  <span className="font-mono text-[#6320ee] text-[11px]">{gatewayForm.upiId}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="py-2.5 rounded-xl text-xs font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Gateway Settings</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: UTR PAYMENTS DESK */}
      {activeTab === 'utr-desk' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                UTR Manual & Auto Verification Desk
              </h3>
              <p className="text-xs text-slate-500">
                Confirm user payment UTR numbers, inspect receipt screenshots, and auto-activate subscriptions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={txFilter}
                onChange={(e) => setTxFilter(e.target.value)}
                className="py-2 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="all">All Payments ({transactions.length})</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <button
                onClick={handleSimulateAutoVerify}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Simulate automated bank webhook matching the UTR"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate Auto-Verification</span>
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Plan / Amount</th>
                    <th className="py-3 px-4">12-Digit UTR</th>
                    <th className="py-3 px-4">Proof Receipt</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {transactions
                    .filter((t) => txFilter === 'all' || t.status === txFilter)
                    .map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white">{tx.userName || 'Customer'}</span>
                            <span className="text-[11px] text-slate-400">{tx.userEmail}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {tx.currency === 'INR' ? `₹${tx.amount}` : `$${tx.amount}`}
                            </span>
                            <span className="text-[11px] text-[#6320ee] dark:text-[#a855f7] capitalize">
                              {tx.planId} ({tx.gatewayType})
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded select-all">
                            {tx.utrNumber || 'N/A'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {tx.proofImageUrl ? (
                            <button
                              onClick={() => setPreviewReceiptUrl(tx.proofImageUrl || null)}
                              className="text-blue-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No image</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              tx.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                : tx.status === 'rejected'
                                ? 'bg-red-50 text-red-600 border border-red-200'
                                : 'bg-amber-50 text-amber-600 border border-amber-200 animate-pulse'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {tx.status === 'pending' ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => handleVerifyTx(tx.id, 'approved')}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleVerifyTx(tx.id, 'rejected')}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer shadow-xs"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              {tx.verifiedBy ? `By ${tx.verifiedBy}` : 'Completed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Receipt Modal Preview */}
          {previewReceiptUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl max-w-lg w-full flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Payment Receipt Proof</h4>
                  <button onClick={() => setPreviewReceiptUrl(null)} className="text-slate-400 hover:text-slate-600">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                <img
                  src={previewReceiptUrl}
                  alt="Receipt"
                  className="max-h-[70vh] object-contain rounded-xl border border-slate-200"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: STORAGE & DEFAULT SPACE SETUP */}
      {activeTab === 'space' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Global Default Storage Quota Setup
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set the default cloud disk storage allocated to newly registered creator accounts.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Default Space Allocation per User (GB)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={settings.default_storage_quota_gb || '10'}
                  onChange={(e) => setSettings({ ...settings, default_storage_quota_gb: e.target.value })}
                  className="w-32 px-3.5 py-2.5 text-base font-bold text-[#6320ee] bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Gigabytes (GB)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                *Can be customized or overridden per user inside the "Users" tab.
              </p>
            </div>

            <div className="flex gap-2">
              {[5, 10, 20, 50, 100].map((gb) => (
                <button
                  type="button"
                  key={gb}
                  onClick={() => setSettings({ ...settings, default_storage_quota_gb: String(gb) })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    settings.default_storage_quota_gb === String(gb)
                      ? 'bg-[#6320ee] text-white border-[#6320ee]'
                      : 'border-slate-200 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {gb} GB
                </button>
              ))}
            </div>

            <button
              onClick={handleSaveSettings}
              className="py-2.5 rounded-xl text-xs font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Storage Default</span>
            </button>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Server Storage Metrics
            </h4>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Total Uploaded Videos:</span>
                <span className="font-bold text-slate-900 dark:text-white">{videos.length} videos</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Live Slots Capacity:</span>
                <span className="font-bold text-slate-900 dark:text-white">{slots.length} slots</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div className="bg-[#6320ee] h-full w-[24%]" />
              </div>
              <span className="text-[11px] text-slate-400">Server Health: Normal • High I/O SSD</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: GOOGLE DRIVE STORAGE (ADMIN ONLY) */}
      {activeTab === 'gdrive' && (
        <div className="flex flex-col gap-8">
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                  <FolderSync className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Google Drive Cloud Video Storage
                    </h3>
                    <span className="bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-red-500/20">
                      Admin Only
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Stream large pre-recorded movies and videos directly from Google Drive 24/7 without consuming local disk.
                  </p>
                </div>
              </div>

              {/* Master ON/OFF Switch */}
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Google Drive Integration:
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleGDrive(!gdriveStatus.enabled)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    gdriveStatus.enabled
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {gdriveStatus.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Config Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Google Drive Folder ID (Containing Movies/Videos)
                </label>
                <input
                  type="text"
                  value={settings.google_drive_folder_id || ''}
                  onChange={(e) => setSettings({ ...settings, google_drive_folder_id: e.target.value })}
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Google Drive API Key (or Service Account)
                </label>
                <input
                  type="password"
                  value={settings.google_drive_api_key || ''}
                  onChange={(e) => setSettings({ ...settings, google_drive_api_key: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Save Google Drive Config</span>
              </button>

              <button
                type="button"
                onClick={handleTestGDriveConnection}
                disabled={isTestingGDrive}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isTestingGDrive ? 'Testing...' : 'Test Connection'}
              </button>

              <button
                type="button"
                onClick={handleLoadGDriveFiles}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                Browse Drive Files
              </button>
            </div>
          </div>

          {/* Google Drive Video Browser & Restream Linker */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Google Drive Movie & Video Library
                </h4>
                <p className="text-xs text-slate-500">
                  Select any movie file from Google Drive to bind to an RTMP live slot and restream 24/7.
                </p>
              </div>

              {/* Slot Target Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Target Slot:</span>
                <select
                  value={selectedSlotForGDrive}
                  onChange={(e) => setSelectedSlotForGDrive(e.target.value)}
                  className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-800 border rounded-lg cursor-pointer"
                >
                  {slots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.streamStatus})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {(gdriveFiles.length > 0
                ? gdriveFiles
                : [
                    {
                      id: 'gdrive_movie_01',
                      name: 'Feature_Movie_HD_1080p.mp4',
                      mimeType: 'video/mp4',
                      sizeFormatted: '1.43 GB',
                      downloadUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                      isFolder: false,
                    },
                    {
                      id: 'gdrive_stream_02',
                      name: 'Continuous_Chill_24x7_Broadcast.mp4',
                      mimeType: 'video/mp4',
                      sizeFormatted: '810 MB',
                      downloadUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                      isFolder: false,
                    },
                    {
                      id: 'gdrive_nature_03',
                      name: 'Nature_Relaxation_Loop_4K.mp4',
                      mimeType: 'video/mp4',
                      sizeFormatted: '1.95 GB',
                      downloadUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
                      isFolder: false,
                    },
                  ]
              ).map((file) => (
                <div
                  key={file.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <FileVideo className="w-8 h-8 text-[#6320ee] shrink-0 mt-0.5" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-[11px] text-slate-400">{file.sizeFormatted || 'Movie file'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleImportGDriveVideo(file)}
                    className="w-full py-2 rounded-lg text-xs font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Import & Restream on Slot</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

