-- StreamAdda MySQL Database Schema
CREATE DATABASE IF NOT EXISTS streamadda CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE streamadda;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT 'Streamer',
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user', -- 'admin' | 'user'
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' | 'suspended' | 'banned'
  storage_quota_bytes BIGINT NOT NULL DEFAULT 10737418240, -- 10 GB default
  storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  subscription_plan_id VARCHAR(64) NULL,
  subscription_expires_at BIGINT NULL,
  avatar_initials VARCHAR(10) DEFAULT 'S',
  country VARCHAR(100) DEFAULT 'India',
  city VARCHAR(100) DEFAULT 'Mohali',
  phone VARCHAR(50) DEFAULT '',
  phone_code VARCHAR(10) DEFAULT '+91',
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Live Slots table
CREATE TABLE IF NOT EXISTS slots (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  stream_status VARCHAR(50) NOT NULL DEFAULT 'Off',
  expire_on VARCHAR(100) NULL,
  expires_at BIGINT NULL,
  stream_key VARCHAR(255) NULL,
  platform VARCHAR(50) NOT NULL DEFAULT 'YouTube',
  stream_loop BOOLEAN NOT NULL DEFAULT TRUE,
  auto_start_on_key_update BOOLEAN DEFAULT FALSE,
  rtmp_server_url TEXT NULL,
  schedule_start_enabled BOOLEAN DEFAULT FALSE,
  stream_start_time VARCHAR(100) NULL,
  scheduled_start_time_ms BIGINT NULL,
  stream_end_time VARCHAR(100) NULL,
  video_id VARCHAR(64) NULL,
  target_bitrate_kbps INT DEFAULT 2500,
  fps_preset INT DEFAULT 30,
  audio_bitrate_kbps INT DEFAULT 128,
  quality_preset_name VARCHAR(50) DEFAULT '1080p',
  started_at BIGINT NULL,
  live_viewers INT DEFAULT 0,
  bitrate INT DEFAULT 0,
  fps INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NULL,
  title VARCHAR(255) NOT NULL,
  duration VARCHAR(50) DEFAULT '00:00',
  size_bytes BIGINT DEFAULT 0,
  size_formatted VARCHAR(50) DEFAULT '0 MB',
  resolution VARCHAR(50) DEFAULT '1080p',
  thumbnail_url TEXT NULL,
  video_url TEXT NOT NULL,
  video_path TEXT NULL,
  category VARCHAR(100) DEFAULT 'General',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders & Billing records table
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NULL,
  slot_id VARCHAR(64) NULL,
  period VARCHAR(50) NOT NULL,
  count INT DEFAULT 1,
  currency VARCHAR(10) DEFAULT 'INR',
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System Settings & Meta Tags (SEO, Google Drive on/off, default storage)
CREATE TABLE IF NOT EXISTS settings (
  key_name VARCHAR(100) PRIMARY KEY,
  value_text LONGTEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment Gateways Configuration (UPI, Google Pay, Paytm, Razorpay)
CREATE TABLE IF NOT EXISTS payment_gateways (
  id VARCHAR(64) PRIMARY KEY, -- 'upi' | 'gpay' | 'paytm' | 'razorpay'
  name VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  mode VARCHAR(20) NOT NULL DEFAULT 'manual', -- 'manual' | 'automatic'
  upi_id VARCHAR(255) NOT NULL DEFAULT '',
  merchant_name VARCHAR(255) NOT NULL DEFAULT 'StreamAdda Live',
  api_key VARCHAR(255) NOT NULL DEFAULT '',
  api_secret VARCHAR(255) NOT NULL DEFAULT '',
  merchant_id VARCHAR(255) NOT NULL DEFAULT '',
  webhook_secret VARCHAR(255) NOT NULL DEFAULT '',
  qr_code_image_url TEXT NULL,
  instructions TEXT NULL,
  auto_verify BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subscription Plans (Admin customizable)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  period VARCHAR(50) NOT NULL, -- 'Days' | 'Weeks' | 'Months' | '3 Months' | 'Year'
  duration_label VARCHAR(50) NOT NULL,
  duration_days INT NOT NULL DEFAULT 30,
  price_inr DECIMAL(10, 2) NOT NULL DEFAULT 1999,
  price_usd DECIMAL(10, 2) NOT NULL DEFAULT 24.99,
  storage_gb INT NOT NULL DEFAULT 10,
  max_slots INT NOT NULL DEFAULT 1,
  features_json TEXT NULL, -- JSON array of string features
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  badge_text VARCHAR(100) NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment Transactions & UTR Submissions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(255) DEFAULT '',
  user_email VARCHAR(255) DEFAULT '',
  plan_id VARCHAR(64) NOT NULL,
  slot_id VARCHAR(64) NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  gateway_type VARCHAR(50) NOT NULL DEFAULT 'upi', -- 'upi' | 'gpay' | 'paytm' | 'razorpay'
  utr_number VARCHAR(100) NULL, -- 12-digit UTR submitted by user
  proof_image_url TEXT NULL, -- Uploaded receipt screenshot
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'failed'
  admin_note TEXT NULL,
  verified_by VARCHAR(64) NULL,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
