export type SlotStatus = 'active' | 'expired' | 'inactive' | 'pending_approval';
export type StreamStatus = 'Off' | 'Live' | 'Scheduled';
export type StreamingPlatform = 'YouTube' | 'Facebook' | 'Twitch' | 'Custom RTMP';

export interface VideoItem {
  id: string;
  userId?: string;
  title: string;
  duration: string;
  sizeBytes: number;
  sizeFormatted: string;
  resolution: string;
  thumbnailUrl: string;
  videoUrl: string;
  videoPath?: string;
  createdAt: string;
  category?: string;
}

export interface Slot {
  id: string;
  userId?: string;
  name: string;
  status: SlotStatus;
  streamStatus: StreamStatus;
  expireOn: string;
  expiresAt: number; // Unix timestamp in ms
  streamKey: string;
  platform: StreamingPlatform;
  streamLoop: boolean;
  autoStartOnKeyUpdate?: boolean;
  rtmpServerUrl?: string;
  // Subscription & Payment approval
  subscriptionPlanId?: string;
  paymentStatus?: 'pending' | 'approved' | 'rejected';
  pendingUtrNumber?: string;
  // Schedule Stream Start options
  scheduleStartEnabled?: boolean;
  streamStartTime?: string;
  scheduledStartTimeMs?: number;
  streamEndTime: string;
  videoId?: string;
  // Stream Quality & Bitrate Settings
  targetBitrateKbps?: number; // e.g. 2500, 4500, 5000, 6000
  fpsPreset?: 30 | 60;
  audioBitrateKbps?: number; // e.g. 128, 160, 192
  qualityPresetName?: string; // '720p', '1080p', '1080p60', 'custom'
  // Live stats when streaming
  startedAt?: number;
  liveViewers?: number;
  bitrate?: number;
  fps?: number;
}

export interface UserProfile {
  name: string;
  id: string;
  email: string;
  avatarInitials: string;
  role?: 'admin' | 'user';
  status?: 'active' | 'suspended' | 'banned';
  storageQuotaBytes?: number;
  storageUsedBytes?: number;
  subscriptionPlanId?: string | null;
  subscriptionExpiresAt?: number | null;
  country: string;
  city: string;
  phone: string;
  phoneCode: string;
  theme: 'light' | 'dark';
  createdAt?: string;
}

export type BillingPeriod = '3 Months' | 'Months' | 'Weeks' | 'Days' | 'Year';

export interface BillingPlanInfo {
  period: BillingPeriod;
  title: string;
  durationLabel: string;
  priceINR: number;
  priceUSD: number;
  storage: string;
  features: string[];
}

export interface SubscriptionPlanItem {
  id: string;
  title: string;
  period: BillingPeriod;
  durationLabel: string;
  durationDays: number;
  priceINR: number;
  priceUSD: number;
  storageGB: number;
  maxSlots: number;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  badgeText?: string | null;
  displayOrder: number;
}

export interface PaymentGatewayConfig {
  id: 'upi' | 'gpay' | 'paytm' | 'razorpay';
  name: string;
  isEnabled: boolean;
  mode: 'manual' | 'automatic';
  upiId: string;
  merchantName: string;
  apiKey?: string;
  apiSecret?: string;
  merchantId?: string;
  webhookSecret?: string;
  qrCodeImageUrl?: string | null;
  instructions?: string;
  autoVerify: boolean;
  updatedAt?: string;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  slotId?: string;
  amount: number;
  currency: 'INR' | 'USD';
  gatewayType: 'upi' | 'gpay' | 'paytm' | 'razorpay';
  utrNumber?: string;
  proofImageUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'failed';
  adminNote?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface SiteMetaSettings {
  site_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  og_image?: string;
  canonical_url?: string;
  custom_head_scripts?: string;
  default_storage_quota_gb?: string;
  google_drive_enabled?: string;
  google_drive_folder_id?: string;
  google_drive_api_key?: string;
  google_drive_service_account_json?: string;
  default_payment_gateway?: string;
  // Homepage Live Video / "How To Live" Customization
  home_live_video_url?: string;
  home_live_video_title?: string;
  home_live_video_subtitle?: string;
  home_live_video_badge?: string;
  home_live_video_poster?: string;
}

export interface GoogleDriveItem {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  sizeFormatted?: string;
  downloadUrl?: string;
  webViewLink?: string;
  isFolder: boolean;
}
