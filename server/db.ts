import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export interface DbStatus {
  connected: boolean;
  type: 'mysql';
  host: string;
  port: number;
  database: string;
  user: string;
  error?: string;
  tablesReady: boolean;
}

const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || process.env.MYSQL_PORT) || 3306,
  user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.MYSQL_PASSWORD || ''),
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'streamadda',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool: mysql.Pool | null = null;
let isConnected = false;
let lastError: string | undefined = undefined;
let tablesInitialized = false;

// Fallback in-memory state in case MySQL server is offline / restarting
const defaultAdminMemoryHash = '222f5d9c937f64b37f4af8d3b95f7f04:3b0083e8ce22cfa55bfff0981d2dc2d344b21e3e43ee79a33db478a586da48f2d7ea9b2c038fd237b7bfd2dd0c2c576d5d0a9658e565ab459d0678253b95fcfb';
const memoryFallback = {
  users: new Map<string, any>([
    [
      '6ae0fd7c4863791bef736a0a',
      {
        id: '6ae0fd7c4863791bef736a0a',
        name: 'Satnam Singh',
        email: 'britishpunjabitv13@gmail.com',
        password_hash: defaultAdminMemoryHash,
        passwordHash: defaultAdminMemoryHash,
        role: 'admin',
        status: 'active',
        storageQuotaBytes: 10737418240,
        storageUsedBytes: 0,
        avatarInitials: 'S',
        country: 'India',
        city: 'Mohali',
        phone: '88470 57896',
        phoneCode: '+91',
        theme: 'light',
      },
    ],
    [
      'usr_demo_creator',
      {
        id: 'usr_demo_creator',
        name: 'Gurpreet Singh',
        email: 'gurpreet.streamer@gmail.com',
        role: 'user',
        status: 'active',
        storageQuotaBytes: 10737418240,
        storageUsedBytes: 0,
        avatarInitials: 'G',
        country: 'India',
        city: 'Chandigarh',
        phone: '98765 43210',
        phoneCode: '+91',
        theme: 'light',
      },
    ],
  ]),
  slots: new Map<string, any>([
    [
      'slot-1',
      {
        id: 'slot-1',
        userId: '6ae0fd7c4863791bef736a0a',
        name: '24/7 Punjabi News & Music Live',
        status: 'active',
        paymentStatus: 'approved',
        streamStatus: 'Live',
        platform: 'YouTube',
        streamKey: 'e4uw-x7zb-5090-1ujz-9zek',
        streamLoop: true,
        autoStartOnKeyUpdate: true,
        rtmpServerUrl: 'rtmp://a.rtmp.youtube.com/live2',
        videoId: 'vid_default_lofi',
        targetBitrateKbps: 2500,
        fpsPreset: 30,
        audioBitrateKbps: 128,
        qualityPresetName: '720p',
        startedAt: Date.now() - 7200000,
        liveViewers: 142,
        bitrate: 2480,
        fps: 30,
        expiresAt: Date.now() + 90 * 24 * 3600 * 1000,
        expireOn: '08 Feb 2027 - 11:59 PM',
        subscriptionPlanId: 'Quarterly',
      },
    ],
    [
      'slot_demo_101',
      {
        id: 'slot_demo_101',
        userId: 'usr_demo_creator',
        name: 'Slot 1794208421804',
        status: 'pending_approval',
        paymentStatus: 'pending',
        streamStatus: 'Off',
        platform: 'YouTube',
        streamKey: '',
        streamLoop: true,
        autoStartOnKeyUpdate: true,
        expiresAt: Date.now() + 86400000,
        expireOn: 'Tomorrow - 11:59 PM',
        subscriptionPlanId: 'Months',
      },
    ],
  ]),
  videos: new Map<string, any>(),
  orders: [] as any[],
  settings: new Map<string, string>(),
  paymentGateways: new Map<string, any>(),
  subscriptionPlans: new Map<string, any>(),
  paymentTransactions: new Map<string, any>([
    [
      'tx_sample_101',
      {
        id: 'tx_sample_101',
        userId: 'usr_demo_creator',
        userName: 'Gurpreet Singh',
        userEmail: 'gurpreet.streamer@gmail.com',
        planId: 'Months',
        slotId: 'slot_demo_101',
        amount: 799,
        currency: 'INR',
        gatewayType: 'upi',
        utrNumber: '431289567104',
        proofImageUrl: null,
        status: 'pending',
        adminNote: 'Awaiting Admin UTR verification & slot activation',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ],
    [
      'tx_sample_102',
      {
        id: 'tx_sample_102',
        userId: '6ae0fd7c4863791bef736a0a',
        userName: 'Satnam Singh (British Punjabi TV)',
        userEmail: 'britishpunjabitv13@gmail.com',
        planId: 'Quarterly',
        slotId: 'slot-1',
        amount: 1999,
        currency: 'INR',
        gatewayType: 'upi',
        utrNumber: '431289567105',
        proofImageUrl: null,
        status: 'approved',
        adminNote: 'Approved by Admin',
        verifiedBy: 'Satnam Singh',
        verifiedAt: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
  ]),
};

export async function initDatabase(): Promise<boolean> {
  try {
    // 1. Try to ensure database exists if permitted (in shared hosting, DB is pre-created via panel)
    try {
      const adminConnection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
      });

      await adminConnection.query(
        `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      await adminConnection.end();
    } catch (dbCreateErr: any) {
      // Ignored: On shared hosting (Hostinger, cPanel), user may lack CREATE DATABASE privilege
      console.log(`[MySQL] Note: Skipped auto-create database (${dbCreateErr?.message || 'shared hosting'}). Connecting directly...`);
    }

    // 2. Initialize connection pool with the target database
    pool = mysql.createPool(dbConfig);

    // Test connection
    const conn = await pool.getConnection();
    conn.release();

    // 3. Create tables & migrate if not exist
    await createTables(pool);

    isConnected = true;
    tablesInitialized = true;
    lastError = undefined;
    console.log(`[MySQL] Connected successfully to database "${dbConfig.database}" at ${dbConfig.host}:${dbConfig.port}`);
    return true;
  } catch (err: any) {
    isConnected = false;
    tablesInitialized = false;
    lastError = err?.message || 'Failed to connect to MySQL';
    console.warn(`[MySQL] Connection warning: ${lastError}`);
    console.warn(`[MySQL] Make sure MySQL is running on ${dbConfig.host}:${dbConfig.port} and configured in .env`);
    return false;
  }
}

async function createTables(targetPool: mysql.Pool) {
  // Users table
  await targetPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL DEFAULT 'Streamer',
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      storage_quota_bytes BIGINT NOT NULL DEFAULT 10737418240,
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
  `);

  // Dynamically add columns to users table if already existed
  const userAlterations = [
    'ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER email',
    "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user' AFTER password_hash",
    "ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' AFTER role",
    'ALTER TABLE users ADD COLUMN storage_quota_bytes BIGINT NOT NULL DEFAULT 10737418240 AFTER status',
    'ALTER TABLE users ADD COLUMN storage_used_bytes BIGINT NOT NULL DEFAULT 0 AFTER storage_quota_bytes',
    'ALTER TABLE users ADD COLUMN subscription_plan_id VARCHAR(64) NULL AFTER storage_used_bytes',
    'ALTER TABLE users ADD COLUMN subscription_expires_at BIGINT NULL AFTER subscription_plan_id',
  ];
  for (const q of userAlterations) {
    try {
      await targetPool.query(q);
    } catch {}
  }

  // Slots table
  await targetPool.query(`
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
  `);

  try {
    await targetPool.query('ALTER TABLE slots ADD COLUMN user_id VARCHAR(64) NULL AFTER id');
  } catch {}

  // Videos table
  await targetPool.query(`
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
  `);

  try {
    await targetPool.query('ALTER TABLE videos ADD COLUMN user_id VARCHAR(64) NULL AFTER id');
  } catch {}

  // Orders table
  await targetPool.query(`
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
  `);

  // System Settings & Meta Tags
  await targetPool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key_name VARCHAR(100) PRIMARY KEY,
      value_text LONGTEXT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Payment Gateways Configuration
  await targetPool.query(`
    CREATE TABLE IF NOT EXISTS payment_gateways (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      mode VARCHAR(20) NOT NULL DEFAULT 'manual',
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
  `);

  // Subscription Plans
  await targetPool.query(`
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      period VARCHAR(50) NOT NULL,
      duration_label VARCHAR(50) NOT NULL,
      duration_days INT NOT NULL DEFAULT 30,
      price_inr DECIMAL(10, 2) NOT NULL DEFAULT 1999,
      price_usd DECIMAL(10, 2) NOT NULL DEFAULT 24.99,
      storage_gb INT NOT NULL DEFAULT 10,
      max_slots INT NOT NULL DEFAULT 1,
      features_json TEXT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_popular BOOLEAN NOT NULL DEFAULT FALSE,
      badge_text VARCHAR(100) NULL,
      display_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Payment Transactions & UTR Submissions
  await targetPool.query(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      user_name VARCHAR(255) DEFAULT '',
      user_email VARCHAR(255) DEFAULT '',
      plan_id VARCHAR(64) NOT NULL,
      slot_id VARCHAR(64) NULL,
      amount DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      gateway_type VARCHAR(50) NOT NULL DEFAULT 'upi',
      utr_number VARCHAR(100) NULL,
      proof_image_url TEXT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      admin_note TEXT NULL,
      verified_by VARCHAR(64) NULL,
      verified_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Seed default settings, payment gateways, and plans
  await seedDefaults(targetPool);
}

async function seedDefaults(targetPool: mysql.Pool) {
  // 1. Seed settings
  const defaultSettings: [string, string][] = [
    ['site_title', 'StreamAdda - 24/7 Cloud Live Streaming for Creators'],
    ['meta_description', 'Stream your Pre-Recorded videos 24x7 nonstop to YouTube, Facebook, Twitch with cloud RTMP servers. Grow subscribers and monetize with zero downtime.'],
    ['meta_keywords', 'live streaming, 24/7 stream, youtube live, stream pre recorded video, rtmp streaming, cloud live streamer'],
    ['og_image', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80'],
    ['canonical_url', 'https://streamadda.com'],
    ['custom_head_scripts', ''],
    ['default_storage_quota_gb', '10'],
    ['google_drive_enabled', 'false'],
    ['google_drive_folder_id', ''],
    ['google_drive_api_key', ''],
    ['google_drive_service_account_json', ''],
    ['default_payment_gateway', 'upi'],
  ];

  for (const [k, v] of defaultSettings) {
    try {
      await targetPool.query(
        'INSERT IGNORE INTO settings (key_name, value_text) VALUES (?, ?)',
        [k, v]
      );
    } catch {}
  }

  // 2. Seed payment gateways
  const defaultGateways = [
    {
      id: 'upi',
      name: 'UPI Dynamic QR & Direct Intent',
      isEnabled: 1,
      mode: 'manual',
      upiId: 'streamadda@upi',
      merchantName: 'StreamAdda Live Broadcast',
      instructions: 'Scan the dynamic QR code with any UPI app (GPay, PhonePe, Paytm, BHIM) and submit your 12-digit UTR reference number below.',
      autoVerify: 0,
    },
    {
      id: 'gpay',
      name: 'Google Pay (Merchant VPA)',
      isEnabled: 1,
      mode: 'manual',
      upiId: 'streamadda@okaxis',
      merchantName: 'StreamAdda Media Services',
      instructions: 'Pay directly via Google Pay to our merchant VPA and submit your transaction UTR reference.',
      autoVerify: 0,
    },
    {
      id: 'paytm',
      name: 'Paytm Business Gateway',
      isEnabled: 1,
      mode: 'manual',
      upiId: 'paytmqr.streamadda@paytm',
      merchantName: 'StreamAdda Media',
      instructions: 'Pay via Paytm UPI or Wallet scan and enter your Order ID / UTR.',
      autoVerify: 0,
    },
    {
      id: 'razorpay',
      name: 'Razorpay Automatic Gateway',
      isEnabled: 0,
      mode: 'automatic',
      upiId: '',
      merchantName: 'StreamAdda Inc',
      instructions: 'Pay instantly via Credit/Debit Cards, NetBanking, and UPI with instant automated activation.',
      autoVerify: 1,
    },
  ];

  for (const g of defaultGateways) {
    try {
      await targetPool.query(
        `INSERT IGNORE INTO payment_gateways (
          id, name, is_enabled, mode, upi_id, merchant_name, instructions, auto_verify
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [g.id, g.name, g.isEnabled, g.mode, g.upiId, g.merchantName, g.instructions, g.autoVerify]
      );
    } catch {}
  }

  // 3. Seed subscription plans
  const defaultPlans = [
    {
      id: 'plan_days',
      title: 'Daily Live Pass',
      period: 'Days',
      durationLabel: '1 Day',
      durationDays: 1,
      priceINR: 199,
      priceUSD: 2.99,
      storageGB: 5,
      maxSlots: 1,
      features: ['24/7 Continuous Loop Streaming', '1080p Full HD at 60fps', '5 GB Cloud Video Storage', 'Basic RTMP Ingest Support'],
      isActive: 1,
      isPopular: 0,
      badgeText: null,
      displayOrder: 1,
    },
    {
      id: 'plan_weeks',
      title: 'Weekly Starter',
      period: 'Weeks',
      durationLabel: '1 Week',
      durationDays: 7,
      priceINR: 499,
      priceUSD: 6.99,
      storageGB: 10,
      maxSlots: 1,
      features: ['24/7 Continuous Loop Streaming', '1080p Full HD at 60fps', '10 GB Cloud Video Storage', 'Stream Scheduler', 'Priority Cloud Transcoding'],
      isActive: 1,
      isPopular: 0,
      badgeText: null,
      displayOrder: 2,
    },
    {
      id: 'plan_months',
      title: 'Monthly Creator',
      period: 'Months',
      durationLabel: '1 Month',
      durationDays: 30,
      priceINR: 1499,
      priceUSD: 19.99,
      storageGB: 20,
      maxSlots: 2,
      features: ['24/7 Continuous Loop Streaming', '1080p Full HD at 60fps', '20 GB Cloud Video Storage', 'Multi-Slot Management', 'Stream Scheduler & Auto-Start', 'Standard Support'],
      isActive: 1,
      isPopular: 0,
      badgeText: null,
      displayOrder: 3,
    },
    {
      id: 'plan_3months',
      title: '3 Months Pro Plan',
      period: '3 Months',
      durationLabel: '3 Months',
      durationDays: 90,
      priceINR: 3499,
      priceUSD: 44.99,
      storageGB: 50,
      maxSlots: 3,
      features: ['24/7 Continuous Loop Streaming', '1080p Full HD at 60fps', '50 GB Cloud Video Storage', 'Best Value · Save 30%', 'Unlimited Video Swapping', '24/7 Dedicated Server Support'],
      isActive: 1,
      isPopular: 1,
      badgeText: 'Best Value · Save 30%',
      displayOrder: 4,
    },
    {
      id: 'plan_year',
      title: 'Annual Master Plan',
      period: 'Year',
      durationLabel: '1 Year',
      durationDays: 365,
      priceINR: 9999,
      priceUSD: 129.99,
      storageGB: 100,
      maxSlots: 5,
      features: ['24/7 Continuous Loop Streaming', '1080p Full HD at 60fps', '100 GB Cloud Video Storage', '5 Concurrent Live Slots', 'Dedicated Cloud Server', 'VIP Priority Support'],
      isActive: 1,
      isPopular: 0,
      badgeText: 'Pro Tier',
      displayOrder: 5,
    },
  ];

  for (const p of defaultPlans) {
    try {
      await targetPool.query(
        `INSERT IGNORE INTO subscription_plans (
          id, title, period, duration_label, duration_days, price_inr, price_usd,
          storage_gb, max_slots, features_json, is_active, is_popular, badge_text, display_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id,
          p.title,
          p.period,
          p.durationLabel,
          p.durationDays,
          p.priceINR,
          p.priceUSD,
          p.storageGB,
          p.maxSlots,
          JSON.stringify(p.features),
          p.isActive,
          p.isPopular,
          p.badgeText,
          p.displayOrder,
        ]
      );
    } catch {}
  }

  // 4. Ensure admin user exists, has role = 'admin', and has the valid admin123 password hash
  const defaultAdminEmail = 'britishpunjabitv13@gmail.com';
  const defaultAdminHash = '222f5d9c937f64b37f4af8d3b95f7f04:3b0083e8ce22cfa55bfff0981d2dc2d344b21e3e43ee79a33db478a586da48f2d7ea9b2c038fd237b7bfd2dd0c2c576d5d0a9658e565ab459d0678253b95fcfb';
  try {
    const [existing] = await targetPool.query<mysql.RowDataPacket[]>(
      'SELECT id, password_hash, role FROM users WHERE LOWER(email) = ?',
      [defaultAdminEmail]
    );
    if (existing.length === 0) {
      await targetPool.query(
        `INSERT INTO users (
          id, name, email, password_hash, role, status,
          storage_quota_bytes, storage_used_bytes, avatar_initials, country, city, phone, phone_code, theme
        ) VALUES (?, ?, ?, ?, 'admin', 'active', 10737418240, 0, 'S', 'India', 'Mohali', '88470 57896', '+91', 'light')`,
        ['6ae0fd7c4863791bef736a0a', 'Satnam Singh', defaultAdminEmail, defaultAdminHash]
      );
      console.log(`[MySQL] Initialized default administrator user: ${defaultAdminEmail}`);
    } else {
      // Ensure user has admin role
      await targetPool.query(
        "UPDATE users SET role = 'admin', status = 'active' WHERE LOWER(email) = ?",
        [defaultAdminEmail]
      );
    }
  } catch (err: any) {
    console.warn('[MySQL] Admin user check error:', err?.message);
  }
}

export function getDbStatus(): DbStatus {
  return {
    connected: isConnected,
    type: 'mysql',
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    error: lastError,
    tablesReady: tablesInitialized,
  };
}

// ---------------- USER OPERATIONS ----------------
function mapUserRow(r: any) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    passwordHash: r.password_hash || r.passwordHash,
    role: (r.role || 'user') as 'admin' | 'user',
    status: (r.status || 'active') as 'active' | 'suspended' | 'banned',
    storageQuotaBytes: Number(r.storage_quota_bytes) || 10 * 1024 * 1024 * 1024,
    storageUsedBytes: Number(r.storage_used_bytes) || 0,
    subscriptionPlanId: r.subscription_plan_id || null,
    subscriptionExpiresAt: r.subscription_expires_at ? Number(r.subscription_expires_at) : null,
    avatarInitials: r.avatar_initials,
    country: r.country,
    city: r.city,
    phone: r.phone,
    phoneCode: r.phone_code,
    theme: r.theme,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
  };
}

export async function getAllUsers() {
  if (pool && isConnected) {
    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT * FROM users ORDER BY created_at DESC'
      );
      return rows.map(mapUserRow);
    } catch (err: any) {
      console.error('[MySQL] getAllUsers error:', err);
    }
  }
  return Array.from(memoryFallback.users.values()).map(mapUserRow);
}

export async function getUserByEmail(email: string) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  if (pool && isConnected) {
    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT * FROM users WHERE LOWER(email) = ?',
        [normalizedEmail]
      );
      if (rows.length > 0) {
        return mapUserRow(rows[0]);
      }
    } catch (err: any) {
      console.error('[MySQL] getUserByEmail error:', err);
    }
  }

  for (const u of memoryFallback.users.values()) {
    if (u.email && u.email.toLowerCase() === normalizedEmail) {
      return mapUserRow(u);
    }
  }
  return null;
}

export async function createUserWithPassword(user: {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role?: 'admin' | 'user';
  avatarInitials?: string;
  country?: string;
  city?: string;
  phone?: string;
  phoneCode?: string;
  theme?: string;
}) {
  const normalizedEmail = (user.email || '').trim().toLowerCase();
  const avatarInitials = user.avatarInitials || (user.name ? user.name.charAt(0).toUpperCase() : 'U');
  const role = user.role || (normalizedEmail === 'britishpunjabitv13@gmail.com' ? 'admin' : 'user');

  const record = {
    ...user,
    email: normalizedEmail,
    role,
    status: 'active' as const,
    storageQuotaBytes: 10 * 1024 * 1024 * 1024,
    storageUsedBytes: 0,
    subscriptionPlanId: null as string | null,
    subscriptionExpiresAt: null as number | null,
    avatarInitials,
    country: user.country || 'India',
    city: user.city || 'Mohali',
    phone: user.phone || '',
    phoneCode: user.phoneCode || '+91',
    theme: user.theme || 'light',
    createdAt: new Date().toISOString(),
  };

  memoryFallback.users.set(user.id, record);

  if (pool && isConnected) {
    try {
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, status, storage_quota_bytes, avatar_initials, country, city, phone, phone_code, theme)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           password_hash = VALUES(password_hash),
           role = VALUES(role),
           status = VALUES(status),
           avatar_initials = VALUES(avatar_initials),
           country = VALUES(country),
           city = VALUES(city),
           phone = VALUES(phone),
           phone_code = VALUES(phone_code),
           theme = VALUES(theme)`,
        [
          record.id,
          record.name,
          record.email,
          record.passwordHash,
          record.role,
          record.status,
          record.storageQuotaBytes,
          record.avatarInitials,
          record.country,
          record.city,
          record.phone,
          record.phoneCode,
          record.theme,
        ]
      );
    } catch (err: any) {
      console.error('[MySQL] createUserWithPassword error:', err);
      throw err;
    }
  }
  return record;
}

export async function updateUserPassword(id: string, passwordHash: string) {
  if (pool && isConnected) {
    try {
      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
    } catch (err: any) {
      console.error('[MySQL] updateUserPassword error:', err);
      throw err;
    }
  }
  const inMem = memoryFallback.users.get(id);
  if (inMem) {
    inMem.password_hash = passwordHash;
    inMem.passwordHash = passwordHash;
  }
}

export async function getUser(id: string) {
  if (pool && isConnected) {
    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [id]);
      if (rows.length > 0) {
        return mapUserRow(rows[0]);
      }
    } catch (err: any) {
      console.error('[MySQL] getUser error:', err);
    }
  }
  const fallback = memoryFallback.users.get(id);
  return fallback ? mapUserRow(fallback) : null;
}

export async function upsertUser(user: any) {
  memoryFallback.users.set(user.id, user);

  if (pool && isConnected) {
    try {
      await pool.query(
        `INSERT INTO users (id, name, email, avatar_initials, country, city, phone, phone_code, theme)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           email = VALUES(email),
           avatar_initials = VALUES(avatar_initials),
           country = VALUES(country),
           city = VALUES(city),
           phone = VALUES(phone),
           phone_code = VALUES(phone_code),
           theme = VALUES(theme)`,
        [
          user.id,
          user.name || 'Streamer',
          user.email || '',
          user.avatarInitials || (user.name ? user.name[0].toUpperCase() : 'S'),
          user.country || 'India',
          user.city || 'Mohali',
          user.phone || '',
          user.phoneCode || '+91',
          user.theme || 'light',
        ]
      );
    } catch (err: any) {
      console.error('[MySQL] upsertUser error:', err);
    }
  }
  return user;
}

export async function updateUserAdmin(id: string, updates: Partial<{
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended' | 'banned';
  storageQuotaBytes: number;
  storageUsedBytes: number;
  subscriptionPlanId: string | null;
  subscriptionExpiresAt: number | null;
  phone: string;
  country: string;
  city: string;
}>) {
  const current = await getUser(id);
  if (!current) throw new Error('User not found');

  const merged = { ...current, ...updates };
  memoryFallback.users.set(id, merged);

  if (pool && isConnected) {
    try {
      await pool.query(
        `UPDATE users
         SET name = ?, email = ?, role = ?, status = ?, storage_quota_bytes = ?,
             subscription_plan_id = ?, subscription_expires_at = ?, phone = ?, country = ?, city = ?
         WHERE id = ?`,
        [
          merged.name,
          merged.email,
          merged.role,
          merged.status,
          merged.storageQuotaBytes,
          merged.subscriptionPlanId,
          merged.subscriptionExpiresAt,
          merged.phone,
          merged.country,
          merged.city,
          id,
        ]
      );
    } catch (err) {
      console.error('[MySQL] updateUserAdmin error:', err);
      throw err;
    }
  }
  return merged;
}

export async function deleteUser(id: string) {
  memoryFallback.users.delete(id);

  if (pool && isConnected) {
    try {
      await pool.query('DELETE FROM users WHERE id = ?', [id]);
      await pool.query('DELETE FROM orders WHERE user_id = ?', [id]);
      await pool.query('DELETE FROM payment_transactions WHERE user_id = ?', [id]);
    } catch (err: any) {
      console.error('[MySQL] deleteUser error:', err);
    }
  }
  return true;
}

// ---------------- SETTINGS & META TAGS ----------------
export async function getSettings(): Promise<Record<string, string>> {
  const result: Record<string, string> = {
    site_title: 'StreamAdda - 24/7 Cloud Live Streaming for Creators',
    meta_description: 'Stream your Pre-Recorded videos 24x7 nonstop to YouTube, Facebook, Twitch with cloud RTMP servers. Grow subscribers and monetize with zero downtime.',
    meta_keywords: 'live streaming, 24/7 stream, youtube live, stream pre recorded video, rtmp streaming, cloud live streamer',
    og_image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
    canonical_url: 'https://streamadda.com',
    custom_head_scripts: '',
    default_storage_quota_gb: '10',
    google_drive_enabled: 'false',
    google_drive_folder_id: '',
    google_drive_api_key: '',
    google_drive_service_account_json: '',
    default_payment_gateway: 'upi',
    home_live_video_url: 'https://www.youtube.com/watch?v=7PIji8OubXU',
    home_live_video_title: 'How To Setup Youtube 24x7 Livestream',
    home_live_video_subtitle: 'Stream LIVE',
    home_live_video_badge: 'LIVE 1.5K VIEWERS',
    home_live_video_poster: '',
  };

  if (pool && isConnected) {
    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT key_name, value_text FROM settings');
      for (const row of rows) {
        if (row.key_name && row.value_text !== null) {
          result[row.key_name] = row.value_text;
        }
      }
      return result;
    } catch (err) {
      console.error('[MySQL] getSettings error:', err);
    }
  }

  for (const [k, v] of memoryFallback.settings.entries()) {
    result[k] = v;
  }
  return result;
}

export async function updateSettings(settingsMap: Record<string, string>): Promise<void> {
  for (const [k, v] of Object.entries(settingsMap)) {
    const val = String(v ?? '');
    memoryFallback.settings.set(k, val);
    if (pool && isConnected) {
      try {
        await pool.query(
          `INSERT INTO settings (key_name, value_text) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)`,
          [k, val]
        );
      } catch (err) {
        console.error('[MySQL] updateSettings error for key', k, err);
      }
    }
  }
}

// ---------------- PAYMENT GATEWAYS ----------------
function mapGatewayRow(r: any) {
  return {
    id: r.id,
    name: r.name,
    isEnabled: Boolean(r.is_enabled),
    mode: (r.mode || 'manual') as 'manual' | 'automatic',
    upiId: r.upi_id || '',
    merchantName: r.merchant_name || 'StreamAdda Live',
    apiKey: r.api_key || '',
    apiSecret: r.api_secret || '',
    merchantId: r.merchant_id || '',
    webhookSecret: r.webhook_secret || '',
    qrCodeImageUrl: r.qr_code_image_url || null,
    instructions: r.instructions || '',
    autoVerify: Boolean(r.auto_verify),
    updatedAt: r.updated_at,
  };
}

export async function getPaymentGateways(): Promise<any[]> {
  if (pool && isConnected) {
    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM payment_gateways ORDER BY id ASC');
      if (rows.length > 0) return rows.map(mapGatewayRow);
    } catch (err) {
      console.error('[MySQL] getPaymentGateways error:', err);
    }
  }
  return Array.from(memoryFallback.paymentGateways.values()).map(mapGatewayRow);
}

export async function updatePaymentGateway(id: string, updates: any): Promise<any> {
  const current = (await getPaymentGateways()).find((g) => g.id === id) || { id, name: id.toUpperCase() };
  const merged = { ...current, ...updates, id };
  memoryFallback.paymentGateways.set(id, merged);

  if (pool && isConnected) {
    try {
      await pool.query(
        `INSERT INTO payment_gateways (
          id, name, is_enabled, mode, upi_id, merchant_name,
          api_key, api_secret, merchant_id, webhook_secret,
          qr_code_image_url, instructions, auto_verify
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          is_enabled = VALUES(is_enabled),
          mode = VALUES(mode),
          upi_id = VALUES(upi_id),
          merchant_name = VALUES(merchant_name),
          api_key = VALUES(api_key),
          api_secret = VALUES(api_secret),
          merchant_id = VALUES(merchant_id),
          webhook_secret = VALUES(webhook_secret),
          qr_code_image_url = VALUES(qr_code_image_url),
          instructions = VALUES(instructions),
          auto_verify = VALUES(auto_verify)`,
        [
          id,
          merged.name,
          merged.isEnabled ? 1 : 0,
          merged.mode || 'manual',
          merged.upiId || '',
          merged.merchantName || 'StreamAdda Live',
          merged.apiKey || '',
          merged.apiSecret || '',
          merged.merchantId || '',
          merged.webhookSecret || '',
          merged.qrCodeImageUrl || null,
          merged.instructions || '',
          merged.autoVerify ? 1 : 0,
        ]
      );
    } catch (err) {
      console.error('[MySQL] updatePaymentGateway error:', err);
    }
  }
  return merged;
}

// ---------------- SUBSCRIPTION PLANS ----------------
function mapPlanRow(r: any) {
  let features: string[] = [];
  try {
    features = typeof r.features_json === 'string'
      ? JSON.parse(r.features_json)
      : (Array.isArray(r.features) ? r.features : (r.features_json || []));
  } catch {}

  const durationDays = Number(r.duration_days ?? r.durationDays) || (
    r.period === 'Days' ? 1 :
    r.period === 'Weeks' ? 7 :
    r.period === 'Months' ? 30 :
    r.period === '3 Months' ? 90 :
    r.period === 'Year' ? 365 : 30
  );

  let durationLabel = r.duration_label || r.durationLabel;
  if (!durationLabel || (r.period === 'Days' && durationLabel.toLowerCase().includes('month'))) {
    durationLabel = r.period === 'Days' ? (durationDays === 1 ? '1 Day' : `${durationDays} Days`) :
                    r.period === 'Weeks' ? (durationDays === 7 ? '1 Week' : `${durationDays} Days`) :
                    r.period === 'Months' ? (durationDays === 30 ? '1 Month' : `${durationDays} Days`) :
                    r.period === '3 Months' ? (durationDays === 90 ? '3 Months' : `${durationDays} Days`) :
                    r.period === 'Year' ? (durationDays === 365 ? '1 Year' : `${durationDays} Days`) :
                    `${durationDays} Days`;
  }

  return {
    id: String(r.id),
    title: r.title,
    period: r.period || 'Months',
    durationLabel,
    durationDays,
    priceINR: Number(r.price_inr ?? r.priceINR) || 1999,
    priceUSD: Number(r.price_usd ?? r.priceUSD) || 24.99,
    storageGB: Number(r.storage_gb ?? r.storageGB) || 10,
    maxSlots: Number(r.max_slots ?? r.maxSlots) || 1,
    features,
    isActive: r.is_active !== undefined ? Boolean(r.is_active) : (r.isActive !== undefined ? Boolean(r.isActive) : true),
    isPopular: r.is_popular !== undefined ? Boolean(r.is_popular) : Boolean(r.isPopular),
    badgeText: r.badge_text ?? r.badgeText ?? null,
    displayOrder: Number(r.display_order ?? r.displayOrder) || 0,
  };
}

export async function getSubscriptionPlans(onlyActive = false): Promise<any[]> {
  if (pool && isConnected) {
    try {
      const sql = onlyActive
        ? 'SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY display_order ASC'
        : 'SELECT * FROM subscription_plans ORDER BY display_order ASC';
      const [rows] = await pool.query<mysql.RowDataPacket[]>(sql);
      if (rows.length > 0) return rows.map(mapPlanRow);
    } catch (err) {
      console.error('[MySQL] getSubscriptionPlans error:', err);
    }
  }

  const all = Array.from(memoryFallback.subscriptionPlans.values()).map(mapPlanRow);
  return onlyActive ? all.filter((p) => p.isActive) : all;
}

export async function saveSubscriptionPlan(plan: any): Promise<any> {
  const planId = plan.id || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const features = Array.isArray(plan.features) ? plan.features : [];
  const featuresJson = JSON.stringify(features);

  const durationDays = Number(plan.durationDays ?? plan.duration_days) || (
    plan.period === 'Days' ? 1 :
    plan.period === 'Weeks' ? 7 :
    plan.period === 'Months' ? 30 :
    plan.period === '3 Months' ? 90 :
    plan.period === 'Year' ? 365 : 30
  );

  let durationLabel = plan.durationLabel || plan.duration_label;
  if (!durationLabel || (plan.period === 'Days' && durationLabel.toLowerCase().includes('month'))) {
    durationLabel = plan.period === 'Days' ? (durationDays === 1 ? '1 Day' : `${durationDays} Days`) :
                    plan.period === 'Weeks' ? (durationDays === 7 ? '1 Week' : `${durationDays} Days`) :
                    plan.period === 'Months' ? (durationDays === 30 ? '1 Month' : `${durationDays} Days`) :
                    plan.period === '3 Months' ? (durationDays === 90 ? '3 Months' : `${durationDays} Days`) :
                    plan.period === 'Year' ? (durationDays === 365 ? '1 Year' : `${durationDays} Days`) :
                    `${durationDays} Days`;
  }

  const priceINR = Number(plan.priceINR ?? plan.price_inr ?? 1999);
  const priceUSD = Number(plan.priceUSD ?? plan.price_usd ?? 24.99);
  const storageGB = Number(plan.storageGB ?? plan.storage_gb ?? 10);
  const maxSlots = Number(plan.maxSlots ?? plan.max_slots ?? 1);
  const isActive = plan.isActive !== undefined ? (plan.isActive ? 1 : 0) : (plan.is_active !== undefined ? (plan.is_active ? 1 : 0) : 1);
  const isPopular = plan.isPopular ? 1 : (plan.is_popular ? 1 : 0);
  const badgeText = plan.badgeText ?? plan.badge_text ?? null;
  const displayOrder = Number(plan.displayOrder ?? plan.display_order ?? 0);

  const record = {
    id: planId,
    title: plan.title,
    period: plan.period || 'Months',
    durationLabel,
    durationDays,
    priceINR,
    priceUSD,
    storageGB,
    maxSlots,
    features,
    features_json: featuresJson,
    isActive: Boolean(isActive),
    isPopular: Boolean(isPopular),
    badgeText,
    displayOrder,
    duration_label: durationLabel,
    duration_days: durationDays,
    price_inr: priceINR,
    price_usd: priceUSD,
    storage_gb: storageGB,
    max_slots: maxSlots,
    is_active: isActive,
    is_popular: isPopular,
    badge_text: badgeText,
    display_order: displayOrder,
  };

  memoryFallback.subscriptionPlans.set(planId, record);

  if (pool && isConnected) {
    try {
      await pool.query(
        `INSERT INTO subscription_plans (
          id, title, period, duration_label, duration_days,
          price_inr, price_usd, storage_gb, max_slots, features_json,
          is_active, is_popular, badge_text, display_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          period = VALUES(period),
          duration_label = VALUES(duration_label),
          duration_days = VALUES(duration_days),
          price_inr = VALUES(price_inr),
          price_usd = VALUES(price_usd),
          storage_gb = VALUES(storage_gb),
          max_slots = VALUES(max_slots),
          features_json = VALUES(features_json),
          is_active = VALUES(is_active),
          is_popular = VALUES(is_popular),
          badge_text = VALUES(badge_text),
          display_order = VALUES(display_order)`,
        [
          planId,
          record.title,
          record.period,
          record.durationLabel,
          record.durationDays,
          record.priceINR,
          record.priceUSD,
          record.storageGB,
          record.maxSlots,
          featuresJson,
          isActive,
          isPopular,
          badgeText,
          displayOrder,
        ]
      );
    } catch (err) {
      console.error('[MySQL] saveSubscriptionPlan error:', err);
    }
  }
  return mapPlanRow(record);
}

export async function deleteSubscriptionPlan(id: string): Promise<boolean> {
  memoryFallback.subscriptionPlans.delete(id);
  if (pool && isConnected) {
    try {
      await pool.query('DELETE FROM subscription_plans WHERE id = ?', [id]);
      return true;
    } catch (err) {
      console.error('[MySQL] deleteSubscriptionPlan error:', err);
    }
  }
  return true;
}

// ---------------- PAYMENT TRANSACTIONS & UTR SUBMISSIONS ----------------
function mapTxRow(r: any) {
  const userId = r.user_id || r.userId || '';
  const userName = r.resolved_user_name || r.user_name || r.userName || '';
  const userEmail = r.resolved_user_email || r.user_email || r.userEmail || '';
  const planId = r.plan_id || r.planId || 'Months';
  const slotId = r.slot_id || r.slotId || undefined;
  const gatewayType = r.gateway_type || r.gatewayType || 'upi';
  const utr = String(r.utr_number || r.utrNumber || r.utr || '').trim();
  const proofImageUrl = r.proof_image_url || r.proofImageUrl || undefined;
  const adminNote = r.admin_note || r.adminNote || undefined;
  const verifiedBy = r.verified_by || r.verifiedBy || undefined;

  return {
    id: r.id,
    userId,
    userName,
    userEmail,
    planId,
    slotId,
    amount: Number(r.amount || 0),
    currency: r.currency || 'INR',
    gatewayType,
    utrNumber: utr,
    proofImageUrl,
    status: r.status || 'pending',
    adminNote,
    verifiedBy,
    verifiedAt: r.verified_at ? new Date(r.verified_at).toISOString() : (r.verifiedAt || undefined),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : (r.createdAt || new Date().toISOString()),
  };
}

export async function createPaymentTransaction(tx: any): Promise<any> {
  const txId = tx.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let resolvedName = tx.userName || '';
  let resolvedEmail = tx.userEmail || '';
  if ((!resolvedName || !resolvedEmail) && tx.userId) {
    const u = memoryFallback.users.get(tx.userId);
    if (u) {
      resolvedName = resolvedName || u.name || '';
      resolvedEmail = resolvedEmail || u.email || '';
    }
  }

  const cleanUtr = String(tx.utrNumber || tx.utr || '').trim();
  const record = {
    ...tx,
    id: txId,
    userId: tx.userId || '',
    userName: resolvedName || 'Registered Creator',
    userEmail: resolvedEmail,
    planId: tx.planId || 'Months',
    slotId: tx.slotId || undefined,
    amount: Number(tx.amount || 0),
    currency: tx.currency || 'INR',
    gatewayType: tx.gatewayType || 'upi',
    utrNumber: cleanUtr,
    proofImageUrl: tx.proofImageUrl || undefined,
    status: tx.status || 'pending',
    createdAt: tx.createdAt || new Date().toISOString(),
  };
  memoryFallback.paymentTransactions.set(txId, record);

  if (pool && isConnected) {
    try {
      await pool.query(
        `INSERT INTO payment_transactions (
          id, user_id, user_name, user_email, plan_id, slot_id,
          amount, currency, gateway_type, utr_number, proof_image_url, status, admin_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          txId,
          record.userId,
          record.userName,
          record.userEmail,
          record.planId,
          record.slotId || null,
          record.amount,
          record.currency,
          record.gatewayType,
          record.utrNumber || null,
          record.proofImageUrl || null,
          record.status,
          record.adminNote || null,
        ]
      );
    } catch (err) {
      console.error('[MySQL] createPaymentTransaction error:', err);
    }
  }
  return record;
}

export async function getAllPaymentTransactions(statusFilter?: string): Promise<any[]> {
  if (pool && isConnected) {
    try {
      const sql = statusFilter && statusFilter !== 'all'
        ? `SELECT pt.*, COALESCE(NULLIF(pt.user_name, ''), u.name, 'Registered Creator') AS resolved_user_name,
                  COALESCE(NULLIF(pt.user_email, ''), u.email, '') AS resolved_user_email
           FROM payment_transactions pt
           LEFT JOIN users u ON pt.user_id = u.id
           WHERE pt.status = ?
           ORDER BY pt.created_at DESC`
        : `SELECT pt.*, COALESCE(NULLIF(pt.user_name, ''), u.name, 'Registered Creator') AS resolved_user_name,
                  COALESCE(NULLIF(pt.user_email, ''), u.email, '') AS resolved_user_email
           FROM payment_transactions pt
           LEFT JOIN users u ON pt.user_id = u.id
           ORDER BY pt.created_at DESC`;
      const params = statusFilter && statusFilter !== 'all' ? [statusFilter] : [];
      const [rows] = await pool.query<mysql.RowDataPacket[]>(sql, params);
      return rows.map((r: any) => {
        const mapped = mapTxRow(r);
        return {
          ...mapped,
          userName: mapped.userName || r.resolved_user_name || 'Registered Creator',
          userEmail: mapped.userEmail || r.resolved_user_email || '',
        };
      });
    } catch (err) {
      console.error('[MySQL] getAllPaymentTransactions error:', err);
    }
  }
  const all = Array.from(memoryFallback.paymentTransactions.values()).map((t: any) => {
    const u = t.userId ? memoryFallback.users.get(t.userId) : null;
    const mapped = mapTxRow(t);
    return {
      ...mapped,
      userName: mapped.userName || u?.name || (mapped.userEmail ? mapped.userEmail.split('@')[0] : 'Registered Creator'),
      userEmail: mapped.userEmail || u?.email || '',
      utrNumber: mapped.utrNumber || t.utrNumber || t.utr || '',
      slotId: mapped.slotId || t.slotId || undefined,
    };
  });
  return statusFilter && statusFilter !== 'all' ? all.filter((t) => t.status === statusFilter) : all;
}

export async function updatePaymentTransactionStatus(
  id: string,
  status: 'pending' | 'approved' | 'rejected' | 'failed',
  adminNote?: string,
  verifiedBy?: string
): Promise<any> {
  let tx = memoryFallback.paymentTransactions.get(id);
  if (!tx) {
    const all = await getAllPaymentTransactions();
    tx = all.find((t) => t.id === id);
  }
  if (!tx) throw new Error('Transaction not found');

  const now = new Date();
  tx.status = status;
  tx.adminNote = adminNote ?? tx.adminNote;
  tx.verifiedBy = verifiedBy ?? 'admin';
  tx.verifiedAt = now.toISOString();

  memoryFallback.paymentTransactions.set(id, tx);
  tx.verifiedAt = now.toISOString();

  memoryFallback.paymentTransactions.set(id, tx);

  if (pool && isConnected) {
    try {
      await pool.query(
        `UPDATE payment_transactions
         SET status = ?, admin_note = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, tx.adminNote || null, tx.verifiedBy, id]
      );
    } catch (err) {
      console.error('[MySQL] updatePaymentTransactionStatus error:', err);
    }
  }

  // If approved: record order and provision slot / user subscription!
  if (status === 'approved') {
    try {
      await createOrder({
        id: `ord_${Date.now()}`,
        userId: tx.userId,
        slotId: tx.slotId,
        period: tx.planId,
        count: 1,
        currency: tx.currency,
        amount: tx.amount,
        status: 'completed',
      });

      // Fetch dynamic subscription plans to determine exact durationDays
      const plans = await getSubscriptionPlans();
      const matchedPlan = plans.find((p: any) => p.id === tx.planId || p.period === tx.planId);
      let daysToAdd = matchedPlan?.durationDays || 30;
      if (!matchedPlan) {
        const lowerPlan = String(tx.planId || '').toLowerCase();
        if (lowerPlan.includes('3 month') || lowerPlan.includes('quarter') || lowerPlan === 'quarterly') {
          daysToAdd = 90;
        } else if (lowerPlan.includes('month') || lowerPlan === 'months' || lowerPlan === 'monthly') {
          daysToAdd = 30;
        } else if (lowerPlan.includes('week') || lowerPlan === 'weeks' || lowerPlan === 'weekly') {
          daysToAdd = 7;
        } else if (lowerPlan.includes('day') || lowerPlan === 'days' || lowerPlan === 'daily' || lowerPlan === 'trial') {
          daysToAdd = 1;
        } else if (lowerPlan.includes('year') || lowerPlan.includes('annual')) {
          daysToAdd = 365;
        }
      }

      // Check target slot:
      // If tx.slotId is provided: this is an existing slot renewal
      let targetSlot = tx.slotId ? await getSlot(tx.slotId) : null;
      const userSlots = tx.userId ? await getSlots(tx.userId) : [];

      if (!targetSlot && tx.userId) {
        // If there is an existing pending_approval slot for this user, activate that
        targetSlot = userSlots.find((s: any) => s.status === 'pending_approval') || null;
      }

function formatSlotExpirationDate(timestamp: number): string {
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

      if (targetSlot) {
        // Renew / Activate existing slot
        const currentExp = targetSlot.expiresAt && targetSlot.expiresAt > Date.now() ? targetSlot.expiresAt : Date.now();
        const newExp = currentExp + daysToAdd * 24 * 3600 * 1000;
        const expireOnStr = formatSlotExpirationDate(newExp);
        await upsertSlot({
          ...targetSlot,
          status: 'active',
          paymentStatus: 'approved',
          expiresAt: newExp,
          expireOn: expireOnStr,
        });
        tx.slotId = targetSlot.id;
        if (pool && isConnected) {
          await pool.query('UPDATE payment_transactions SET slot_id = ? WHERE id = ?', [targetSlot.id, id]);
        }
      } else if (tx.userId) {
        // Brand new slot creation! User paid for a new slot without having a premature slot added before.
        // Now that admin confirmed payment, create the usable active slot as per plan payment!
        const nextSlotIndex = userSlots.length + 1;
        let slotName = `Live Slot ${nextSlotIndex}`;

        if (tx.adminNote && tx.adminNote.includes('Requested Slot:')) {
          const extracted = tx.adminNote.split('Requested Slot:')[1]?.trim();
          if (extracted) slotName = extracted;
        } else if (tx.notes && String(tx.notes).trim()) {
          slotName = String(tx.notes).trim();
        }

        const nowMs = Date.now();
        const expMs = nowMs + daysToAdd * 24 * 3600 * 1000;
        const expireOnStr = formatSlotExpirationDate(expMs);

        const newSlot = {
          id: `slot_${tx.userId ? tx.userId.slice(-6) : 'user'}_${Date.now().toString().slice(-4)}`,
          userId: tx.userId,
          name: slotName,
          status: 'active',
          paymentStatus: 'approved',
          streamStatus: 'Off',
          platform: 'YouTube',
          streamKey: '',
          streamLoop: true,
          expiresAt: expMs,
          expireOn: expireOnStr,
          subscriptionPlanId: matchedPlan?.id || tx.planId || 'Months',
        };
        await upsertSlot(newSlot);
        tx.slotId = newSlot.id;
        if (pool && isConnected) {
          await pool.query('UPDATE payment_transactions SET slot_id = ? WHERE id = ?', [newSlot.id, id]);
        }
      }
    } catch (provisionErr) {
      console.error('[MySQL] Provisioning on approval error:', provisionErr);
    }
  }

  return tx;
}

// ---------------- SLOT OPERATIONS ----------------
function mapSlotRow(r: any) {
  let expiresAt = r.expires_at ? Number(r.expires_at) : undefined;
  if (!expiresAt && r.expire_on) {
    const parsed = Date.parse(String(r.expire_on).replace('-', ' '));
    if (!isNaN(parsed) && parsed > 0) {
      expiresAt = parsed;
    }
  }

  return {
    id: String(r.id),
    userId: r.user_id ? String(r.user_id) : undefined,
    name: r.name || `Slot ${r.id}`,
    status: r.status || 'active',
    streamStatus: r.stream_status || 'Off',
    expireOn: r.expire_on || '',
    expiresAt,
    streamKey: r.stream_key || '',
    platform: r.platform || 'YouTube',
    streamLoop: Boolean(r.stream_loop),
    autoStartOnKeyUpdate: Boolean(r.auto_start_on_key_update),
    rtmpServerUrl: r.rtmp_server_url || '',
    scheduleStartEnabled: Boolean(r.schedule_start_enabled),
    streamStartTime: r.stream_start_time || 'October 30th, 2026 06:00 PM',
    scheduledStartTimeMs: r.scheduled_start_time_ms ? Number(r.scheduled_start_time_ms) : undefined,
    streamEndTime: r.stream_end_time || '',
    videoId: r.video_id || undefined,
    targetBitrateKbps: r.target_bitrate_kbps ? Number(r.target_bitrate_kbps) : 2500,
    fpsPreset: r.fps_preset ? Number(r.fps_preset) : 30,
    audioBitrateKbps: r.audio_bitrate_kbps ? Number(r.audio_bitrate_kbps) : 128,
    qualityPresetName: r.quality_preset_name || '1080p',
    startedAt: r.started_at ? Number(r.started_at) : undefined,
    liveViewers: r.live_viewers ? Number(r.live_viewers) : 0,
    bitrate: r.bitrate ? Number(r.bitrate) : 0,
    fps: r.fps ? Number(r.fps) : 0,
  };
}

export async function getSlots(userId?: string) {
  if (pool && isConnected) {
    try {
      if (userId && userId !== 'all') {
        const [rows] = await pool.query<mysql.RowDataPacket[]>(
          'SELECT * FROM slots WHERE user_id = ? ORDER BY created_at ASC',
          [userId]
        );
        return rows.map(mapSlotRow);
      } else {
        const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM slots ORDER BY created_at DESC');
        return rows.map(mapSlotRow);
      }
    } catch (err: any) {
      console.error('[MySQL] getSlots error:', err);
    }
  }
  const all = Array.from(memoryFallback.slots.values());
  return (userId && userId !== 'all') ? all.filter((s: any) => s.userId === userId) : all;
}

export async function getSlot(id: string) {
  if (pool && isConnected) {
    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM slots WHERE id = ?', [id]);
      if (rows.length > 0) return mapSlotRow(rows[0]);
    } catch (err: any) {
      console.error('[MySQL] getSlot error:', err);
    }
  }
  return memoryFallback.slots.get(id) || null;
}

export async function upsertSlot(slot: any) {
  memoryFallback.slots.set(slot.id, slot);

  if (pool && isConnected) {
    try {
      await pool.query(
        `INSERT INTO slots (
          id, user_id, name, status, stream_status, expire_on, expires_at,
          stream_key, platform, stream_loop, auto_start_on_key_update,
          rtmp_server_url, schedule_start_enabled, stream_start_time,
          scheduled_start_time_ms, stream_end_time, video_id,
          target_bitrate_kbps, fps_preset, audio_bitrate_kbps,
          quality_preset_name, started_at, live_viewers, bitrate, fps
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?
        ) ON DUPLICATE KEY UPDATE
          user_id = COALESCE(VALUES(user_id), user_id),
          name = VALUES(name),
          status = VALUES(status),
          stream_status = VALUES(stream_status),
          expire_on = VALUES(expire_on),
          expires_at = VALUES(expires_at),
          stream_key = VALUES(stream_key),
          platform = VALUES(platform),
          stream_loop = VALUES(stream_loop),
          auto_start_on_key_update = VALUES(auto_start_on_key_update),
          rtmp_server_url = VALUES(rtmp_server_url),
          schedule_start_enabled = VALUES(schedule_start_enabled),
          stream_start_time = VALUES(stream_start_time),
          scheduled_start_time_ms = VALUES(scheduled_start_time_ms),
          stream_end_time = VALUES(stream_end_time),
          video_id = VALUES(video_id),
          target_bitrate_kbps = VALUES(target_bitrate_kbps),
          fps_preset = VALUES(fps_preset),
          audio_bitrate_kbps = VALUES(audio_bitrate_kbps),
          quality_preset_name = VALUES(quality_preset_name),
          started_at = VALUES(started_at),
          live_viewers = VALUES(live_viewers),
          bitrate = VALUES(bitrate),
          fps = VALUES(fps)`,
        [
          slot.id,
          slot.userId || null,
          slot.name,
          slot.status || 'active',
          slot.streamStatus || 'Off',
          slot.expireOn || null,
          slot.expiresAt || null,
          slot.streamKey || null,
          slot.platform || 'YouTube',
          slot.streamLoop ?? true,
          slot.autoStartOnKeyUpdate ?? false,
          slot.rtmpServerUrl || null,
          slot.scheduleStartEnabled ?? false,
          slot.streamStartTime || null,
          slot.scheduledStartTimeMs || null,
          slot.streamEndTime || null,
          slot.videoId || null,
          slot.targetBitrateKbps || 2500,
          slot.fpsPreset || 30,
          slot.audioBitrateKbps || 128,
          slot.qualityPresetName || '1080p',
          slot.startedAt || null,
          slot.liveViewers || 0,
          slot.bitrate || 0,
          slot.fps || 0,
        ]
      );
    } catch (err: any) {
      console.error('[MySQL] upsertSlot error:', err);
    }
  }
  return slot;
}

export async function deleteSlot(id: string) {
  memoryFallback.slots.delete(id);

  if (pool && isConnected) {
    try {
      await pool.query('DELETE FROM slots WHERE id = ?', [id]);
    } catch (err: any) {
      console.error('[MySQL] deleteSlot error:', err);
    }
  }
  return true;
}

// ---------------- VIDEO OPERATIONS ----------------
function mapVideoRow(r: any) {
  return {
    id: r.id,
    userId: r.user_id || undefined,
    title: r.title,
    duration: r.duration,
    sizeBytes: Number(r.size_bytes) || 0,
    sizeFormatted: r.size_formatted,
    resolution: r.resolution,
    thumbnailUrl: r.thumbnail_url,
    videoUrl: r.video_url,
    videoPath: r.video_path,
    category: r.category,
    createdAt: r.created_at ? new Date(r.created_at).toLocaleDateString() : undefined,
  };
}

export async function getVideos(userId?: string) {
  if (pool && isConnected) {
    try {
      if (userId) {
        const [rows] = await pool.query<mysql.RowDataPacket[]>(
          'SELECT * FROM videos WHERE user_id = ? ORDER BY created_at DESC',
          [userId]
        );
        return rows.map(mapVideoRow);
      } else {
        const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM videos ORDER BY created_at DESC');
        return rows.map(mapVideoRow);
      }
    } catch (err: any) {
      console.error('[MySQL] getVideos error:', err);
    }
  }
  const all = Array.from(memoryFallback.videos.values());
  return userId ? all.filter((v: any) => v.userId === userId) : all;
}

export async function getVideo(id: string) {
  if (pool && isConnected) {
    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM videos WHERE id = ?', [id]);
      if (rows.length > 0) return mapVideoRow(rows[0]);
    } catch (err: any) {
      console.error('[MySQL] getVideo error:', err);
    }
  }
  return memoryFallback.videos.get(id) || null;
}

export async function upsertVideo(video: any) {
  memoryFallback.videos.set(video.id, video);

  if (pool && isConnected) {
    try {
      await pool.query(
        `INSERT INTO videos (
          id, user_id, title, duration, size_bytes, size_formatted, resolution,
          thumbnail_url, video_url, video_path, category
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          user_id = COALESCE(VALUES(user_id), user_id),
          title = VALUES(title),
          duration = VALUES(duration),
          size_bytes = VALUES(size_bytes),
          size_formatted = VALUES(size_formatted),
          resolution = VALUES(resolution),
          thumbnail_url = VALUES(thumbnail_url),
          video_url = VALUES(video_url),
          video_path = VALUES(video_path),
          category = VALUES(category)`,
        [
          video.id,
          video.userId || null,
          video.title,
          video.duration || '00:00',
          video.sizeBytes || 0,
          video.sizeFormatted || '0 MB',
          video.resolution || '1080p',
          video.thumbnailUrl || null,
          video.videoUrl,
          video.videoPath || null,
          video.category || 'General',
        ]
      );

      if (video.userId) {
        await updateUserStorageUsage(video.userId);
      }
    } catch (err: any) {
      console.error('[MySQL] upsertVideo error:', err);
    }
  }
  return video;
}

export async function deleteVideo(id: string) {
  const existing = memoryFallback.videos.get(id);
  memoryFallback.videos.delete(id);

  if (pool && isConnected) {
    try {
      let ownerId = existing?.userId;
      if (!ownerId) {
        const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT user_id FROM videos WHERE id = ?', [id]);
        if (rows.length > 0) ownerId = rows[0].user_id;
      }

      await pool.query('DELETE FROM videos WHERE id = ?', [id]);

      if (ownerId) {
        await updateUserStorageUsage(ownerId);
      }
    } catch (err: any) {
      console.error('[MySQL] deleteVideo error:', err);
    }
  }
  return true;
}

export async function updateUserStorageUsage(userId: string) {
  if (pool && isConnected) {
    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT COALESCE(SUM(size_bytes), 0) AS total_used FROM videos WHERE user_id = ?',
        [userId]
      );
      const totalUsed = Number(rows[0]?.total_used) || 0;
      await pool.query('UPDATE users SET storage_used_bytes = ? WHERE id = ?', [totalUsed, userId]);
      return totalUsed;
    } catch (err) {
      console.error('[MySQL] updateUserStorageUsage error:', err);
    }
  }
  return 0;
}

// ---------------- ORDER OPERATIONS ----------------
export async function getOrders() {
  if (pool && isConnected) {
    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM orders ORDER BY created_at DESC');
      return rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        slotId: r.slot_id,
        period: r.period,
        count: r.count,
        currency: r.currency,
        amount: Number(r.amount),
        status: r.status,
        createdAt: r.created_at,
      }));
    } catch (err: any) {
      console.error('[MySQL] getOrders error:', err);
    }
  }
  return memoryFallback.orders;
}

export async function createOrder(order: any) {
  memoryFallback.orders.unshift(order);

  if (pool && isConnected) {
    try {
      await pool.query(
        `INSERT INTO orders (id, user_id, slot_id, period, count, currency, amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id,
          order.userId || null,
          order.slotId || null,
          order.period,
          order.count || 1,
          order.currency || 'INR',
          order.amount,
          order.status || 'completed',
        ]
      );
    } catch (err: any) {
      console.error('[MySQL] createOrder error:', err);
    }
  }
  return order;
}
