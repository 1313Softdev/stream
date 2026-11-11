import {
  Slot,
  VideoItem,
  UserProfile,
  SubscriptionPlanItem,
  PaymentGatewayConfig,
  PaymentTransaction,
  SiteMetaSettings,
  GoogleDriveItem,
} from '../types';

export interface DbStatusResponse {
  connected: boolean;
  type: 'mysql';
  host: string;
  port: number;
  database: string;
  user: string;
  error?: string;
  tablesReady: boolean;
}

export async function fetchDbStatus(): Promise<DbStatusResponse> {
  const res = await fetch('/api/db/status');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---------------- Authentication (Register & Login) ----------------
export function getStoredAuthToken(): string | null {
  return localStorage.getItem('streamadda_auth_token');
}

export function setStoredAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('streamadda_auth_token', token);
  } else {
    localStorage.removeItem('streamadda_auth_token');
  }
}

function authHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const token = getStoredAuthToken();
  const res: Record<string, string> = { ...headers };
  if (token) {
    res['Authorization'] = `Bearer ${token}`;
  }
  return res;
}

export async function registerUser(params: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<{ token: string; user: UserProfile; message?: string }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Registration failed');
  }
  setStoredAuthToken(data.token);
  return data;
}

export async function loginUser(params: {
  email: string;
  password: string;
}): Promise<{ token: string; user: UserProfile; message?: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Login failed');
  }
  setStoredAuthToken(data.token);
  return data;
}

export async function fetchCurrentUser(): Promise<UserProfile | null> {
  const token = getStoredAuthToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth/me', {
      headers: authHeaders(),
    });
    if (!res.ok) {
      setStoredAuthToken(null);
      return null;
    }
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export function logoutUserSession() {
  setStoredAuthToken(null);
  localStorage.removeItem('streamadda_user');
}

// User Profile
export async function fetchUserProfile(userId?: string): Promise<UserProfile | null> {
  const url = userId ? `/api/user/${userId}` : '/api/user';
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.user || null;
}

export async function saveUserProfile(profile: UserProfile): Promise<UserProfile> {
  const res = await fetch('/api/user', {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.user;
}

// Slots
export async function fetchSlots(userId?: string): Promise<Slot[]> {
  const url = userId ? `/api/slots?userId=${encodeURIComponent(userId)}` : '/api/slots';
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.slots || [];
}

export async function saveSlot(slot: Slot): Promise<Slot> {
  const res = await fetch('/api/slots', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(slot),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.slot;
}

export async function deleteSlot(slotId: string): Promise<boolean> {
  const res = await fetch(`/api/slots/${slotId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.success;
}

// Videos
export async function fetchVideos(userId?: string): Promise<VideoItem[]> {
  const url = userId ? `/api/videos?userId=${encodeURIComponent(userId)}` : '/api/videos';
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.videos || [];
}

export async function saveVideo(video: VideoItem): Promise<VideoItem> {
  const res = await fetch('/api/videos', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(video),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.video;
}

export async function deleteVideo(videoId: string): Promise<boolean> {
  const res = await fetch(`/api/videos/${videoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.success;
}

// Orders
export async function fetchOrders(): Promise<any[]> {
  const res = await fetch('/api/orders', { headers: authHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.orders || [];
}

export async function recordOrder(order: {
  id: string;
  userId?: string;
  slotId?: string;
  period: string;
  count: number;
  currency: 'INR' | 'USD';
  amount: number;
  status: string;
  utrNumber?: string;
  createdAt?: string;
}): Promise<any> {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(order),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.order;
}

// ==========================================
// ADMIN DASHBOARD API CLIENT METHODS
// (Require Admin Authentication)
// ==========================================

// 1. Settings & Meta Tags
export async function fetchPublicSettings(): Promise<SiteMetaSettings> {
  const res = await fetch('/api/settings');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.settings || {};
}

export async function fetchAdminSettings(): Promise<SiteMetaSettings> {
  const res = await fetch('/api/admin/settings', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.settings || {};
}

export async function saveAdminSettings(settings: SiteMetaSettings): Promise<SiteMetaSettings> {
  const res = await fetch('/api/admin/settings', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.settings;
}

// 2. User Management
export async function fetchAdminUsers(): Promise<UserProfile[]> {
  const res = await fetch('/api/admin/users', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.users || [];
}

export async function createAdminUser(params: {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
  storageQuotaGB?: number;
}): Promise<UserProfile> {
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create user');
  return data.user;
}

export async function updateAdminUser(id: string, updates: Partial<UserProfile & { storageQuotaGB?: number }>): Promise<UserProfile> {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update user');
  return data.user;
}

export async function deleteAdminUser(id: string): Promise<boolean> {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.success;
}

// 3. Subscription Plans
export async function fetchPublicPlans(): Promise<SubscriptionPlanItem[]> {
  const res = await fetch('/api/plans');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.plans || [];
}

export async function fetchAdminPlans(): Promise<SubscriptionPlanItem[]> {
  const res = await fetch('/api/admin/plans', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.plans || [];
}

export async function createAdminPlan(plan: Partial<SubscriptionPlanItem>): Promise<SubscriptionPlanItem> {
  const res = await fetch('/api/admin/plans', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(plan),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create plan');
  return data.plan;
}

export async function updateAdminPlan(id: string, plan: Partial<SubscriptionPlanItem>): Promise<SubscriptionPlanItem> {
  const res = await fetch(`/api/admin/plans/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(plan),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update plan');
  return data.plan;
}

export async function deleteAdminPlan(id: string): Promise<boolean> {
  const res = await fetch(`/api/admin/plans/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.success;
}

// 4. Payment Gateways
export async function fetchPaymentGateways(): Promise<PaymentGatewayConfig[]> {
  const res = await fetch('/api/payment-gateways');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.gateways || [];
}

export async function fetchAdminPaymentGateways(): Promise<PaymentGatewayConfig[]> {
  const res = await fetch('/api/admin/payment-gateways', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.gateways || [];
}

export async function saveAdminPaymentGateway(id: string, updates: Partial<PaymentGatewayConfig>): Promise<PaymentGatewayConfig> {
  const res = await fetch(`/api/admin/payment-gateways/${id}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update gateway');
  return data.gateway;
}

// 5. Payment Transactions & UTR Submissions
export async function uploadPaymentProof(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('proof', file);
  const res = await fetch('/api/payments/upload-proof', {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to upload receipt screenshot');
  return data.url;
}

export async function submitPaymentUtr(payload: {
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  slotId?: string;
  amount: number;
  currency: 'INR' | 'USD';
  gatewayType: 'upi' | 'gpay' | 'paytm' | 'razorpay';
  utrNumber: string;
  proofImageUrl?: string;
  notes?: string;
}): Promise<{ transaction: PaymentTransaction; message: string }> {
  const res = await fetch('/api/payments/submit-utr', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to submit UTR');
  return data;
}

export async function fetchUserTransactions(userId: string): Promise<PaymentTransaction[]> {
  try {
    const res = await fetch(`/api/payments/user-transactions?userId=${encodeURIComponent(userId)}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.transactions || [];
  } catch {
    return [];
  }
}

export async function fetchAdminTransactions(statusFilter = 'all'): Promise<PaymentTransaction[]> {
  const url = statusFilter && statusFilter !== 'all' ? `/api/admin/transactions?status=${statusFilter}` : '/api/admin/transactions';
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.transactions || [];
}

export async function verifyAdminTransaction(
  id: string,
  status: 'approved' | 'rejected' | 'pending',
  adminNote?: string
): Promise<PaymentTransaction> {
  const res = await fetch(`/api/admin/transactions/${id}/verify`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status, adminNote }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to verify transaction');
  return data.transaction;
}

export async function simulateAutoVerifyUtr(utrNumber?: string): Promise<{ message: string; transaction: PaymentTransaction }> {
  const res = await fetch('/api/admin/transactions/simulate-auto-verify', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ utrNumber }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Simulation failed');
  return data;
}

// 6. Google Drive Storage Integration (Admin Only)
export async function fetchGDriveStatus(): Promise<{ enabled: boolean; folderId: string; hasApiKey: boolean; isReady: boolean }> {
  const res = await fetch('/api/admin/gdrive/status', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchGDriveFiles(folderId?: string): Promise<GoogleDriveItem[]> {
  const url = folderId ? `/api/admin/gdrive/files?folderId=${encodeURIComponent(folderId)}` : '/api/admin/gdrive/files';
  const res = await fetch(url, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to list Google Drive files');
  return data.files || [];
}

export async function importGDriveVideo(params: {
  name: string;
  downloadUrl: string;
  slotId?: string;
}): Promise<any> {
  const res = await fetch('/api/admin/gdrive/import', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to import video');
  return data;
}

export async function testGDriveConnection(apiKey: string, folderId?: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/admin/gdrive/test-connection', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ apiKey, folderId }),
  });
  return res.json();
}

/**
 * Parses and extracts an 11-character YouTube video ID from various YouTube URL formats
 * (watch?v=, youtu.be/, live/, embed/, shorts/)
 */
export function getYouTubeVideoId(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts|watch)\b.*?v=|(?:v|e(?:mbed)?|live|shorts)\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regExp);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

/**
 * Formats a slot expiration timestamp into a readable date and exact time string
 * e.g. "12 Nov 2026 - 06:35 AM"
 */
export function formatSlotExpirationDate(timestamp: number): string {
  const d = new Date(timestamp);
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hourStr = hours.toString().padStart(2, '0');
  return `${day} ${month} ${year} - ${hourStr}:${minutes} ${ampm}`;
}
