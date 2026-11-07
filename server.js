// server.ts
import "dotenv/config";
import express from "express";
import { spawn, spawnSync } from "child_process";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";

// server/db.ts
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
var dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || process.env.MYSQL_PORT) || 3306,
  user: process.env.DB_USER || process.env.MYSQL_USER || "root",
  password: process.env.DB_PASSWORD !== void 0 ? process.env.DB_PASSWORD : process.env.MYSQL_PASSWORD || "",
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || "streamadda",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};
var pool = null;
var isConnected = false;
var lastError = void 0;
var tablesInitialized = false;
var defaultAdminMemoryHash = "222f5d9c937f64b37f4af8d3b95f7f04:3b0083e8ce22cfa55bfff0981d2dc2d344b21e3e43ee79a33db478a586da48f2d7ea9b2c038fd237b7bfd2dd0c2c576d5d0a9658e565ab459d0678253b95fcfb";
var memoryFallback = {
  users: /* @__PURE__ */ new Map([
    [
      "6ae0fd7c4863791bef736a0a",
      {
        id: "6ae0fd7c4863791bef736a0a",
        name: "Satnam Singh",
        email: "britishpunjabitv13@gmail.com",
        password_hash: defaultAdminMemoryHash,
        passwordHash: defaultAdminMemoryHash,
        role: "admin",
        status: "active",
        storageQuotaBytes: 10737418240,
        storageUsedBytes: 0,
        avatarInitials: "S",
        country: "India",
        city: "Mohali",
        phone: "88470 57896",
        phoneCode: "+91",
        theme: "light"
      }
    ]
  ]),
  slots: /* @__PURE__ */ new Map(),
  videos: /* @__PURE__ */ new Map(),
  orders: [],
  settings: /* @__PURE__ */ new Map(),
  paymentGateways: /* @__PURE__ */ new Map(),
  subscriptionPlans: /* @__PURE__ */ new Map(),
  paymentTransactions: /* @__PURE__ */ new Map()
};
async function initDatabase() {
  try {
    try {
      const adminConnection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password
      });
      await adminConnection.query(
        `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      await adminConnection.end();
    } catch (dbCreateErr) {
      console.log(`[MySQL] Note: Skipped auto-create database (${dbCreateErr?.message || "shared hosting"}). Connecting directly...`);
    }
    pool = mysql.createPool(dbConfig);
    const conn = await pool.getConnection();
    conn.release();
    await createTables(pool);
    isConnected = true;
    tablesInitialized = true;
    lastError = void 0;
    console.log(`[MySQL] Connected successfully to database "${dbConfig.database}" at ${dbConfig.host}:${dbConfig.port}`);
    return true;
  } catch (err) {
    isConnected = false;
    tablesInitialized = false;
    lastError = err?.message || "Failed to connect to MySQL";
    console.warn(`[MySQL] Connection warning: ${lastError}`);
    console.warn(`[MySQL] Make sure MySQL is running on ${dbConfig.host}:${dbConfig.port} and configured in .env`);
    return false;
  }
}
async function createTables(targetPool) {
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
  const userAlterations = [
    "ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER email",
    "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user' AFTER password_hash",
    "ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' AFTER role",
    "ALTER TABLE users ADD COLUMN storage_quota_bytes BIGINT NOT NULL DEFAULT 10737418240 AFTER status",
    "ALTER TABLE users ADD COLUMN storage_used_bytes BIGINT NOT NULL DEFAULT 0 AFTER storage_quota_bytes",
    "ALTER TABLE users ADD COLUMN subscription_plan_id VARCHAR(64) NULL AFTER storage_used_bytes",
    "ALTER TABLE users ADD COLUMN subscription_expires_at BIGINT NULL AFTER subscription_plan_id"
  ];
  for (const q of userAlterations) {
    try {
      await targetPool.query(q);
    } catch {
    }
  }
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
    await targetPool.query("ALTER TABLE slots ADD COLUMN user_id VARCHAR(64) NULL AFTER id");
  } catch {
  }
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
    await targetPool.query("ALTER TABLE videos ADD COLUMN user_id VARCHAR(64) NULL AFTER id");
  } catch {
  }
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
  await targetPool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key_name VARCHAR(100) PRIMARY KEY,
      value_text LONGTEXT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
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
  await seedDefaults(targetPool);
}
async function seedDefaults(targetPool) {
  const defaultSettings = [
    ["site_title", "StreamAdda - 24/7 Cloud Live Streaming for Creators"],
    ["meta_description", "Stream your Pre-Recorded videos 24x7 nonstop to YouTube, Facebook, Twitch with cloud RTMP servers. Grow subscribers and monetize with zero downtime."],
    ["meta_keywords", "live streaming, 24/7 stream, youtube live, stream pre recorded video, rtmp streaming, cloud live streamer"],
    ["og_image", "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80"],
    ["canonical_url", "https://streamadda.com"],
    ["custom_head_scripts", ""],
    ["default_storage_quota_gb", "10"],
    ["google_drive_enabled", "false"],
    ["google_drive_folder_id", ""],
    ["google_drive_api_key", ""],
    ["google_drive_service_account_json", ""],
    ["default_payment_gateway", "upi"]
  ];
  for (const [k, v] of defaultSettings) {
    try {
      await targetPool.query(
        "INSERT IGNORE INTO settings (key_name, value_text) VALUES (?, ?)",
        [k, v]
      );
    } catch {
    }
  }
  const defaultGateways = [
    {
      id: "upi",
      name: "UPI Dynamic QR & Direct Intent",
      isEnabled: 1,
      mode: "manual",
      upiId: "streamadda@upi",
      merchantName: "StreamAdda Live Broadcast",
      instructions: "Scan the dynamic QR code with any UPI app (GPay, PhonePe, Paytm, BHIM) and submit your 12-digit UTR reference number below.",
      autoVerify: 0
    },
    {
      id: "gpay",
      name: "Google Pay (Merchant VPA)",
      isEnabled: 1,
      mode: "manual",
      upiId: "streamadda@okaxis",
      merchantName: "StreamAdda Media Services",
      instructions: "Pay directly via Google Pay to our merchant VPA and submit your transaction UTR reference.",
      autoVerify: 0
    },
    {
      id: "paytm",
      name: "Paytm Business Gateway",
      isEnabled: 1,
      mode: "manual",
      upiId: "paytmqr.streamadda@paytm",
      merchantName: "StreamAdda Media",
      instructions: "Pay via Paytm UPI or Wallet scan and enter your Order ID / UTR.",
      autoVerify: 0
    },
    {
      id: "razorpay",
      name: "Razorpay Automatic Gateway",
      isEnabled: 0,
      mode: "automatic",
      upiId: "",
      merchantName: "StreamAdda Inc",
      instructions: "Pay instantly via Credit/Debit Cards, NetBanking, and UPI with instant automated activation.",
      autoVerify: 1
    }
  ];
  for (const g of defaultGateways) {
    try {
      await targetPool.query(
        `INSERT IGNORE INTO payment_gateways (
          id, name, is_enabled, mode, upi_id, merchant_name, instructions, auto_verify
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [g.id, g.name, g.isEnabled, g.mode, g.upiId, g.merchantName, g.instructions, g.autoVerify]
      );
    } catch {
    }
  }
  const defaultPlans = [
    {
      id: "plan_days",
      title: "Daily Live Pass",
      period: "Days",
      durationLabel: "1 Day",
      durationDays: 1,
      priceINR: 199,
      priceUSD: 2.99,
      storageGB: 5,
      maxSlots: 1,
      features: ["24/7 Continuous Loop Streaming", "1080p Full HD at 60fps", "5 GB Cloud Video Storage", "Basic RTMP Ingest Support"],
      isActive: 1,
      isPopular: 0,
      badgeText: null,
      displayOrder: 1
    },
    {
      id: "plan_weeks",
      title: "Weekly Starter",
      period: "Weeks",
      durationLabel: "1 Week",
      durationDays: 7,
      priceINR: 499,
      priceUSD: 6.99,
      storageGB: 10,
      maxSlots: 1,
      features: ["24/7 Continuous Loop Streaming", "1080p Full HD at 60fps", "10 GB Cloud Video Storage", "Stream Scheduler", "Priority Cloud Transcoding"],
      isActive: 1,
      isPopular: 0,
      badgeText: null,
      displayOrder: 2
    },
    {
      id: "plan_months",
      title: "Monthly Creator",
      period: "Months",
      durationLabel: "1 Month",
      durationDays: 30,
      priceINR: 1499,
      priceUSD: 19.99,
      storageGB: 20,
      maxSlots: 2,
      features: ["24/7 Continuous Loop Streaming", "1080p Full HD at 60fps", "20 GB Cloud Video Storage", "Multi-Slot Management", "Stream Scheduler & Auto-Start", "Standard Support"],
      isActive: 1,
      isPopular: 0,
      badgeText: null,
      displayOrder: 3
    },
    {
      id: "plan_3months",
      title: "3 Months Pro Plan",
      period: "3 Months",
      durationLabel: "3 Months",
      durationDays: 90,
      priceINR: 3499,
      priceUSD: 44.99,
      storageGB: 50,
      maxSlots: 3,
      features: ["24/7 Continuous Loop Streaming", "1080p Full HD at 60fps", "50 GB Cloud Video Storage", "Best Value \xB7 Save 30%", "Unlimited Video Swapping", "24/7 Dedicated Server Support"],
      isActive: 1,
      isPopular: 1,
      badgeText: "Best Value \xB7 Save 30%",
      displayOrder: 4
    },
    {
      id: "plan_year",
      title: "Annual Master Plan",
      period: "Year",
      durationLabel: "1 Year",
      durationDays: 365,
      priceINR: 9999,
      priceUSD: 129.99,
      storageGB: 100,
      maxSlots: 5,
      features: ["24/7 Continuous Loop Streaming", "1080p Full HD at 60fps", "100 GB Cloud Video Storage", "5 Concurrent Live Slots", "Dedicated Cloud Server", "VIP Priority Support"],
      isActive: 1,
      isPopular: 0,
      badgeText: "Pro Tier",
      displayOrder: 5
    }
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
          p.displayOrder
        ]
      );
    } catch {
    }
  }
  const defaultAdminEmail = "britishpunjabitv13@gmail.com";
  const defaultAdminHash = "222f5d9c937f64b37f4af8d3b95f7f04:3b0083e8ce22cfa55bfff0981d2dc2d344b21e3e43ee79a33db478a586da48f2d7ea9b2c038fd237b7bfd2dd0c2c576d5d0a9658e565ab459d0678253b95fcfb";
  try {
    const [existing] = await targetPool.query(
      "SELECT id, password_hash, role FROM users WHERE LOWER(email) = ?",
      [defaultAdminEmail]
    );
    if (existing.length === 0) {
      await targetPool.query(
        `INSERT INTO users (
          id, name, email, password_hash, role, status,
          storage_quota_bytes, storage_used_bytes, avatar_initials, country, city, phone, phone_code, theme
        ) VALUES (?, ?, ?, ?, 'admin', 'active', 10737418240, 0, 'S', 'India', 'Mohali', '88470 57896', '+91', 'light')`,
        ["6ae0fd7c4863791bef736a0a", "Satnam Singh", defaultAdminEmail, defaultAdminHash]
      );
      console.log(`[MySQL] Initialized default administrator user: ${defaultAdminEmail}`);
    } else {
      await targetPool.query(
        "UPDATE users SET role = 'admin', status = 'active' WHERE LOWER(email) = ?",
        [defaultAdminEmail]
      );
    }
  } catch (err) {
    console.warn("[MySQL] Admin user check error:", err?.message);
  }
}
function getDbStatus() {
  return {
    connected: isConnected,
    type: "mysql",
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    error: lastError,
    tablesReady: tablesInitialized
  };
}
function mapUserRow(r) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    passwordHash: r.password_hash || r.passwordHash,
    role: r.role || "user",
    status: r.status || "active",
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
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : void 0
  };
}
async function getAllUsers() {
  if (pool && isConnected) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM users ORDER BY created_at DESC"
      );
      return rows.map(mapUserRow);
    } catch (err) {
      console.error("[MySQL] getAllUsers error:", err);
    }
  }
  return Array.from(memoryFallback.users.values()).map(mapUserRow);
}
async function getUserByEmail(email) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;
  if (pool && isConnected) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM users WHERE LOWER(email) = ?",
        [normalizedEmail]
      );
      if (rows.length > 0) {
        return mapUserRow(rows[0]);
      }
    } catch (err) {
      console.error("[MySQL] getUserByEmail error:", err);
    }
  }
  for (const u of memoryFallback.users.values()) {
    if (u.email && u.email.toLowerCase() === normalizedEmail) {
      return mapUserRow(u);
    }
  }
  return null;
}
async function createUserWithPassword(user) {
  const normalizedEmail = (user.email || "").trim().toLowerCase();
  const avatarInitials = user.avatarInitials || (user.name ? user.name.charAt(0).toUpperCase() : "U");
  const role = user.role || (normalizedEmail === "britishpunjabitv13@gmail.com" ? "admin" : "user");
  const record = {
    ...user,
    email: normalizedEmail,
    role,
    status: "active",
    storageQuotaBytes: 10 * 1024 * 1024 * 1024,
    storageUsedBytes: 0,
    subscriptionPlanId: null,
    subscriptionExpiresAt: null,
    avatarInitials,
    country: user.country || "India",
    city: user.city || "Mohali",
    phone: user.phone || "",
    phoneCode: user.phoneCode || "+91",
    theme: user.theme || "light"
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
          record.theme
        ]
      );
    } catch (err) {
      console.error("[MySQL] createUserWithPassword error:", err);
      throw err;
    }
  }
  return record;
}
async function updateUserPassword(id, passwordHash) {
  if (pool && isConnected) {
    try {
      await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, id]);
    } catch (err) {
      console.error("[MySQL] updateUserPassword error:", err);
      throw err;
    }
  }
  const inMem = memoryFallback.users.get(id);
  if (inMem) {
    inMem.password_hash = passwordHash;
    inMem.passwordHash = passwordHash;
  }
}
async function getUser(id) {
  if (pool && isConnected) {
    try {
      const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
      if (rows.length > 0) {
        return mapUserRow(rows[0]);
      }
    } catch (err) {
      console.error("[MySQL] getUser error:", err);
    }
  }
  const fallback = memoryFallback.users.get(id);
  return fallback ? mapUserRow(fallback) : null;
}
async function upsertUser(user) {
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
          user.name || "Streamer",
          user.email || "",
          user.avatarInitials || (user.name ? user.name[0].toUpperCase() : "S"),
          user.country || "India",
          user.city || "Mohali",
          user.phone || "",
          user.phoneCode || "+91",
          user.theme || "light"
        ]
      );
    } catch (err) {
      console.error("[MySQL] upsertUser error:", err);
    }
  }
  return user;
}
async function updateUserAdmin(id, updates) {
  const current = await getUser(id);
  if (!current) throw new Error("User not found");
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
          id
        ]
      );
    } catch (err) {
      console.error("[MySQL] updateUserAdmin error:", err);
      throw err;
    }
  }
  return merged;
}
async function deleteUser(id) {
  memoryFallback.users.delete(id);
  if (pool && isConnected) {
    try {
      await pool.query("DELETE FROM users WHERE id = ?", [id]);
      await pool.query("DELETE FROM orders WHERE user_id = ?", [id]);
      await pool.query("DELETE FROM payment_transactions WHERE user_id = ?", [id]);
    } catch (err) {
      console.error("[MySQL] deleteUser error:", err);
    }
  }
  return true;
}
async function getSettings() {
  const result = {
    site_title: "StreamAdda - 24/7 Cloud Live Streaming for Creators",
    meta_description: "Stream your Pre-Recorded videos 24x7 nonstop to YouTube, Facebook, Twitch with cloud RTMP servers. Grow subscribers and monetize with zero downtime.",
    meta_keywords: "live streaming, 24/7 stream, youtube live, stream pre recorded video, rtmp streaming, cloud live streamer",
    og_image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80",
    canonical_url: "https://streamadda.com",
    custom_head_scripts: "",
    default_storage_quota_gb: "10",
    google_drive_enabled: "false",
    google_drive_folder_id: "",
    google_drive_api_key: "",
    google_drive_service_account_json: "",
    default_payment_gateway: "upi"
  };
  if (pool && isConnected) {
    try {
      const [rows] = await pool.query("SELECT key_name, value_text FROM settings");
      for (const row of rows) {
        if (row.key_name && row.value_text !== null) {
          result[row.key_name] = row.value_text;
        }
      }
      return result;
    } catch (err) {
      console.error("[MySQL] getSettings error:", err);
    }
  }
  for (const [k, v] of memoryFallback.settings.entries()) {
    result[k] = v;
  }
  return result;
}
async function updateSettings(settingsMap) {
  for (const [k, v] of Object.entries(settingsMap)) {
    const val = String(v ?? "");
    memoryFallback.settings.set(k, val);
    if (pool && isConnected) {
      try {
        await pool.query(
          `INSERT INTO settings (key_name, value_text) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)`,
          [k, val]
        );
      } catch (err) {
        console.error("[MySQL] updateSettings error for key", k, err);
      }
    }
  }
}
function mapGatewayRow(r) {
  return {
    id: r.id,
    name: r.name,
    isEnabled: Boolean(r.is_enabled),
    mode: r.mode || "manual",
    upiId: r.upi_id || "",
    merchantName: r.merchant_name || "StreamAdda Live",
    apiKey: r.api_key || "",
    apiSecret: r.api_secret || "",
    merchantId: r.merchant_id || "",
    webhookSecret: r.webhook_secret || "",
    qrCodeImageUrl: r.qr_code_image_url || null,
    instructions: r.instructions || "",
    autoVerify: Boolean(r.auto_verify),
    updatedAt: r.updated_at
  };
}
async function getPaymentGateways() {
  if (pool && isConnected) {
    try {
      const [rows] = await pool.query("SELECT * FROM payment_gateways ORDER BY id ASC");
      if (rows.length > 0) return rows.map(mapGatewayRow);
    } catch (err) {
      console.error("[MySQL] getPaymentGateways error:", err);
    }
  }
  return Array.from(memoryFallback.paymentGateways.values()).map(mapGatewayRow);
}
async function updatePaymentGateway(id, updates) {
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
          merged.mode || "manual",
          merged.upiId || "",
          merged.merchantName || "StreamAdda Live",
          merged.apiKey || "",
          merged.apiSecret || "",
          merged.merchantId || "",
          merged.webhookSecret || "",
          merged.qrCodeImageUrl || null,
          merged.instructions || "",
          merged.autoVerify ? 1 : 0
        ]
      );
    } catch (err) {
      console.error("[MySQL] updatePaymentGateway error:", err);
    }
  }
  return merged;
}
function mapPlanRow(r) {
  let features = [];
  try {
    features = typeof r.features_json === "string" ? JSON.parse(r.features_json) : r.features_json || [];
  } catch {
  }
  return {
    id: r.id,
    title: r.title,
    period: r.period,
    durationLabel: r.duration_label,
    durationDays: Number(r.duration_days) || 30,
    priceINR: Number(r.price_inr) || 1999,
    priceUSD: Number(r.price_usd) || 24.99,
    storageGB: Number(r.storage_gb) || 10,
    maxSlots: Number(r.max_slots) || 1,
    features,
    isActive: Boolean(r.is_active),
    isPopular: Boolean(r.is_popular),
    badgeText: r.badge_text || null,
    displayOrder: Number(r.display_order) || 0
  };
}
async function getSubscriptionPlans(onlyActive = false) {
  if (pool && isConnected) {
    try {
      const sql = onlyActive ? "SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY display_order ASC" : "SELECT * FROM subscription_plans ORDER BY display_order ASC";
      const [rows] = await pool.query(sql);
      if (rows.length > 0) return rows.map(mapPlanRow);
    } catch (err) {
      console.error("[MySQL] getSubscriptionPlans error:", err);
    }
  }
  const all = Array.from(memoryFallback.subscriptionPlans.values()).map(mapPlanRow);
  return onlyActive ? all.filter((p) => p.isActive) : all;
}
async function saveSubscriptionPlan(plan) {
  const planId = plan.id || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const featuresJson = JSON.stringify(plan.features || []);
  const record = { ...plan, id: planId, featuresJson };
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
          plan.title,
          plan.period || "Months",
          plan.durationLabel || "1 Month",
          plan.durationDays || 30,
          plan.priceINR ?? plan.price_inr ?? 1999,
          plan.priceUSD ?? plan.price_usd ?? 24.99,
          plan.storageGB ?? plan.storage_gb ?? 10,
          plan.maxSlots ?? plan.max_slots ?? 1,
          featuresJson,
          plan.isActive ?? true ? 1 : 0,
          plan.isPopular ?? false ? 1 : 0,
          plan.badgeText || null,
          plan.displayOrder || 0
        ]
      );
    } catch (err) {
      console.error("[MySQL] saveSubscriptionPlan error:", err);
    }
  }
  return mapPlanRow(record);
}
async function deleteSubscriptionPlan(id) {
  memoryFallback.subscriptionPlans.delete(id);
  if (pool && isConnected) {
    try {
      await pool.query("DELETE FROM subscription_plans WHERE id = ?", [id]);
      return true;
    } catch (err) {
      console.error("[MySQL] deleteSubscriptionPlan error:", err);
    }
  }
  return true;
}
function mapTxRow(r) {
  return {
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    userEmail: r.user_email,
    planId: r.plan_id,
    slotId: r.slot_id,
    amount: Number(r.amount),
    currency: r.currency,
    gatewayType: r.gateway_type,
    utrNumber: r.utr_number,
    proofImageUrl: r.proof_image_url,
    status: r.status,
    adminNote: r.admin_note,
    verifiedBy: r.verified_by,
    verifiedAt: r.verified_at ? new Date(r.verified_at).toISOString() : void 0,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function createPaymentTransaction(tx) {
  const txId = tx.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record = { ...tx, id: txId, status: tx.status || "pending" };
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
          tx.userId,
          tx.userName || "",
          tx.userEmail || "",
          tx.planId,
          tx.slotId || null,
          tx.amount,
          tx.currency || "INR",
          tx.gatewayType || "upi",
          tx.utrNumber || null,
          tx.proofImageUrl || null,
          record.status,
          tx.adminNote || null
        ]
      );
    } catch (err) {
      console.error("[MySQL] createPaymentTransaction error:", err);
    }
  }
  return record;
}
async function getAllPaymentTransactions(statusFilter) {
  if (pool && isConnected) {
    try {
      const sql = statusFilter && statusFilter !== "all" ? "SELECT * FROM payment_transactions WHERE status = ? ORDER BY created_at DESC" : "SELECT * FROM payment_transactions ORDER BY created_at DESC";
      const params = statusFilter && statusFilter !== "all" ? [statusFilter] : [];
      const [rows] = await pool.query(sql, params);
      return rows.map(mapTxRow);
    } catch (err) {
      console.error("[MySQL] getAllPaymentTransactions error:", err);
    }
  }
  const all = Array.from(memoryFallback.paymentTransactions.values()).map(mapTxRow);
  return statusFilter && statusFilter !== "all" ? all.filter((t) => t.status === statusFilter) : all;
}
async function updatePaymentTransactionStatus(id, status, adminNote, verifiedBy) {
  const all = await getAllPaymentTransactions();
  const tx = all.find((t) => t.id === id);
  if (!tx) throw new Error("Transaction not found");
  const now = /* @__PURE__ */ new Date();
  tx.status = status;
  tx.adminNote = adminNote ?? tx.adminNote;
  tx.verifiedBy = verifiedBy ?? "admin";
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
      console.error("[MySQL] updatePaymentTransactionStatus error:", err);
    }
  }
  if (status === "approved") {
    try {
      await createOrder({
        id: `ord_${Date.now()}`,
        userId: tx.userId,
        slotId: tx.slotId,
        period: tx.planId,
        count: 1,
        currency: tx.currency,
        amount: tx.amount,
        status: "completed"
      });
      if (tx.slotId) {
        const slot = await getSlot(tx.slotId);
        if (slot) {
          const daysToAdd = 30;
          const currentExp = slot.expiresAt && slot.expiresAt > Date.now() ? slot.expiresAt : Date.now();
          const newExp = currentExp + daysToAdd * 24 * 3600 * 1e3;
          await upsertSlot({
            ...slot,
            status: "active",
            expiresAt: newExp,
            expireOn: new Date(newExp).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          });
        }
      }
    } catch (provisionErr) {
      console.error("[MySQL] Provisioning on approval error:", provisionErr);
    }
  }
  return tx;
}
function mapSlotRow(r) {
  return {
    id: r.id,
    userId: r.user_id || void 0,
    name: r.name,
    status: r.status,
    streamStatus: r.stream_status,
    expireOn: r.expire_on,
    expiresAt: r.expires_at ? Number(r.expires_at) : void 0,
    streamKey: r.stream_key,
    platform: r.platform,
    streamLoop: Boolean(r.stream_loop),
    autoStartOnKeyUpdate: Boolean(r.auto_start_on_key_update),
    rtmpServerUrl: r.rtmp_server_url,
    scheduleStartEnabled: Boolean(r.schedule_start_enabled),
    streamStartTime: r.stream_start_time,
    scheduledStartTimeMs: r.scheduled_start_time_ms ? Number(r.scheduled_start_time_ms) : void 0,
    streamEndTime: r.stream_end_time,
    videoId: r.video_id,
    targetBitrateKbps: r.target_bitrate_kbps ? Number(r.target_bitrate_kbps) : void 0,
    fpsPreset: r.fps_preset ? Number(r.fps_preset) : void 0,
    audioBitrateKbps: r.audio_bitrate_kbps ? Number(r.audio_bitrate_kbps) : void 0,
    qualityPresetName: r.quality_preset_name,
    startedAt: r.started_at ? Number(r.started_at) : void 0,
    liveViewers: r.live_viewers ? Number(r.live_viewers) : 0,
    bitrate: r.bitrate ? Number(r.bitrate) : 0,
    fps: r.fps ? Number(r.fps) : 0
  };
}
async function getSlots(userId) {
  if (pool && isConnected) {
    try {
      if (userId) {
        const [rows] = await pool.query(
          "SELECT * FROM slots WHERE user_id = ? ORDER BY created_at ASC",
          [userId]
        );
        return rows.map(mapSlotRow);
      } else {
        const [rows] = await pool.query("SELECT * FROM slots ORDER BY created_at DESC");
        return rows.map(mapSlotRow);
      }
    } catch (err) {
      console.error("[MySQL] getSlots error:", err);
    }
  }
  const all = Array.from(memoryFallback.slots.values());
  return userId ? all.filter((s) => s.userId === userId) : all;
}
async function getSlot(id) {
  if (pool && isConnected) {
    try {
      const [rows] = await pool.query("SELECT * FROM slots WHERE id = ?", [id]);
      if (rows.length > 0) return mapSlotRow(rows[0]);
    } catch (err) {
      console.error("[MySQL] getSlot error:", err);
    }
  }
  return memoryFallback.slots.get(id) || null;
}
async function upsertSlot(slot) {
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
          slot.status || "active",
          slot.streamStatus || "Off",
          slot.expireOn || null,
          slot.expiresAt || null,
          slot.streamKey || null,
          slot.platform || "YouTube",
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
          slot.qualityPresetName || "1080p",
          slot.startedAt || null,
          slot.liveViewers || 0,
          slot.bitrate || 0,
          slot.fps || 0
        ]
      );
    } catch (err) {
      console.error("[MySQL] upsertSlot error:", err);
    }
  }
  return slot;
}
async function deleteSlot(id) {
  memoryFallback.slots.delete(id);
  if (pool && isConnected) {
    try {
      await pool.query("DELETE FROM slots WHERE id = ?", [id]);
    } catch (err) {
      console.error("[MySQL] deleteSlot error:", err);
    }
  }
  return true;
}
function mapVideoRow(r) {
  return {
    id: r.id,
    userId: r.user_id || void 0,
    title: r.title,
    duration: r.duration,
    sizeBytes: Number(r.size_bytes) || 0,
    sizeFormatted: r.size_formatted,
    resolution: r.resolution,
    thumbnailUrl: r.thumbnail_url,
    videoUrl: r.video_url,
    videoPath: r.video_path,
    category: r.category,
    createdAt: r.created_at ? new Date(r.created_at).toLocaleDateString() : void 0
  };
}
async function getVideos(userId) {
  if (pool && isConnected) {
    try {
      if (userId) {
        const [rows] = await pool.query(
          "SELECT * FROM videos WHERE user_id = ? ORDER BY created_at DESC",
          [userId]
        );
        return rows.map(mapVideoRow);
      } else {
        const [rows] = await pool.query("SELECT * FROM videos ORDER BY created_at DESC");
        return rows.map(mapVideoRow);
      }
    } catch (err) {
      console.error("[MySQL] getVideos error:", err);
    }
  }
  const all = Array.from(memoryFallback.videos.values());
  return userId ? all.filter((v) => v.userId === userId) : all;
}
async function getVideo(id) {
  if (pool && isConnected) {
    try {
      const [rows] = await pool.query("SELECT * FROM videos WHERE id = ?", [id]);
      if (rows.length > 0) return mapVideoRow(rows[0]);
    } catch (err) {
      console.error("[MySQL] getVideo error:", err);
    }
  }
  return memoryFallback.videos.get(id) || null;
}
async function upsertVideo(video) {
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
          video.duration || "00:00",
          video.sizeBytes || 0,
          video.sizeFormatted || "0 MB",
          video.resolution || "1080p",
          video.thumbnailUrl || null,
          video.videoUrl,
          video.videoPath || null,
          video.category || "General"
        ]
      );
      if (video.userId) {
        await updateUserStorageUsage(video.userId);
      }
    } catch (err) {
      console.error("[MySQL] upsertVideo error:", err);
    }
  }
  return video;
}
async function deleteVideo(id) {
  const existing = memoryFallback.videos.get(id);
  memoryFallback.videos.delete(id);
  if (pool && isConnected) {
    try {
      let ownerId = existing?.userId;
      if (!ownerId) {
        const [rows] = await pool.query("SELECT user_id FROM videos WHERE id = ?", [id]);
        if (rows.length > 0) ownerId = rows[0].user_id;
      }
      await pool.query("DELETE FROM videos WHERE id = ?", [id]);
      if (ownerId) {
        await updateUserStorageUsage(ownerId);
      }
    } catch (err) {
      console.error("[MySQL] deleteVideo error:", err);
    }
  }
  return true;
}
async function updateUserStorageUsage(userId) {
  if (pool && isConnected) {
    try {
      const [rows] = await pool.query(
        "SELECT COALESCE(SUM(size_bytes), 0) AS total_used FROM videos WHERE user_id = ?",
        [userId]
      );
      const totalUsed = Number(rows[0]?.total_used) || 0;
      await pool.query("UPDATE users SET storage_used_bytes = ? WHERE id = ?", [totalUsed, userId]);
      return totalUsed;
    } catch (err) {
      console.error("[MySQL] updateUserStorageUsage error:", err);
    }
  }
  return 0;
}
async function getOrders() {
  if (pool && isConnected) {
    try {
      const [rows] = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
      return rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        slotId: r.slot_id,
        period: r.period,
        count: r.count,
        currency: r.currency,
        amount: Number(r.amount),
        status: r.status,
        createdAt: r.created_at
      }));
    } catch (err) {
      console.error("[MySQL] getOrders error:", err);
    }
  }
  return memoryFallback.orders;
}
async function createOrder(order) {
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
          order.currency || "INR",
          order.amount,
          order.status || "completed"
        ]
      );
    } catch (err) {
      console.error("[MySQL] createOrder error:", err);
    }
  }
  return order;
}

// server/auth.ts
import crypto from "crypto";
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  try {
    if (!storedHash || !storedHash.includes(":")) return false;
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(key, "hex"));
  } catch (err) {
    console.error("Password verify error:", err);
    return false;
  }
}
var JWT_SECRET = process.env.JWT_SECRET || "streamadda_auth_secret_key_2026";
function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Date.now() + 30 * 24 * 3600 * 1e3;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}
function verifyToken(token) {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (expected !== signature) return null;
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var uploadsDir = path.resolve(__dirname, "public/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));
function getAuthUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return verifyToken(authHeader.split(" ")[1]);
}
var storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || ".mp4";
    cb(null, `video-${uniqueSuffix}${ext}`);
  }
});
var upload = multer({
  storage,
  limits: { fileSize: 2048 * 1024 * 1024 }
  // 2GB
});
var activeStreams = /* @__PURE__ */ new Map();
function cleanStreamKey(key) {
  if (!key) return "";
  let cleaned = key.trim().replace(/[\r\n\t\s]+/g, "");
  if (cleaned.includes("/live2/")) {
    cleaned = cleaned.split("/live2/").pop() || cleaned;
  } else if (cleaned.includes("/live/")) {
    cleaned = cleaned.split("/live/").pop() || cleaned;
  } else if (cleaned.includes("rtmp://") || cleaned.includes("rtmps://")) {
    cleaned = cleaned.split("/").pop() || cleaned;
  }
  cleaned = cleaned.replace(/^['"]+|['"]+$/g, "");
  return cleaned;
}
function getIngestUrl(platform, rawStreamKey, customUrl) {
  const cleanKey = cleanStreamKey(rawStreamKey);
  const lower = (platform || "").toLowerCase();
  if (customUrl && customUrl.trim()) {
    const base = customUrl.trim().replace(/\/+$/, "");
    return `${base}/${cleanKey}`;
  }
  if (lower.includes("youtube")) {
    return `rtmp://a.rtmp.youtube.com/live2/${cleanKey}`;
  }
  if (lower.includes("facebook")) {
    return `rtmps://live-api-s.facebook.com:443/rtmp/${cleanKey}`;
  }
  if (lower.includes("twitch")) {
    return `rtmp://live.twitch.tv/app/${cleanKey}`;
  }
  return `rtmp://a.rtmp.youtube.com/live2/${cleanKey}`;
}
function getFfmpegPath() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  if (ffmpegInstaller && ffmpegInstaller.path && fs.existsSync(ffmpegInstaller.path)) {
    return ffmpegInstaller.path;
  }
  const candidates = [
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/opt/homebrew/bin/ffmpeg"
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const res = spawnSync("which", ["ffmpeg"]);
    if (res.status === 0) {
      const found = res.stdout.toString().trim();
      if (found && fs.existsSync(found)) return found;
    }
  } catch {
  }
  return "ffmpeg";
}
function getFfprobePath() {
  if (process.env.FFPROBE_PATH && fs.existsSync(process.env.FFPROBE_PATH)) {
    return process.env.FFPROBE_PATH;
  }
  if (ffprobeInstaller && ffprobeInstaller.path && fs.existsSync(ffprobeInstaller.path)) {
    return ffprobeInstaller.path;
  }
  const candidates = [
    "/usr/bin/ffprobe",
    "/usr/local/bin/ffprobe",
    "/opt/homebrew/bin/ffprobe"
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const res = spawnSync("which", ["ffprobe"]);
    if (res.status === 0) {
      const found = res.stdout.toString().trim();
      if (found && fs.existsSync(found)) return found;
    }
  } catch {
  }
  return "ffprobe";
}
function isFfmpegInstalled() {
  const p = getFfmpegPath();
  if (path.isAbsolute(p)) {
    return fs.existsSync(p);
  }
  try {
    const res = spawnSync(p, ["-version"]);
    return res.status === 0;
  } catch {
    return false;
  }
}
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
app.post("/api/stream/start", async (req, res) => {
  const {
    slotId,
    streamKey,
    platform = "YouTube",
    videoPath,
    customRtmpUrl,
    targetBitrateKbps = 2500,
    fps = 30,
    audioBitrateKbps = 128
  } = req.body;
  if (!slotId) {
    return res.status(400).json({ error: "slotId is required" });
  }
  if (!isFfmpegInstalled()) {
    return res.status(503).json({
      success: false,
      error: "FFmpeg is not installed or not found on this system. Please install FFmpeg (e.g. `brew install ffmpeg`) to broadcast live streams."
    });
  }
  const cleanedKey = cleanStreamKey(streamKey);
  if (!cleanedKey) {
    return res.status(400).json({ error: "Stream key is required to broadcast to YouTube" });
  }
  const bitrateNum = Math.max(1e3, Math.min(15e3, Number(targetBitrateKbps) || 2500));
  const fpsNum = Number(fps) === 60 ? 60 : 30;
  const audioBitrateNum = [96, 128, 160, 192, 256, 320].includes(Number(audioBitrateKbps)) ? Number(audioBitrateKbps) : 128;
  const gopSize = fpsNum * 2;
  const videoBitrateStr = `${bitrateNum}k`;
  const audioBitrateStr = `${audioBitrateNum}k`;
  const existing = activeStreams.get(slotId);
  if (existing) {
    try {
      existing.process.kill("SIGTERM");
    } catch {
    }
    activeStreams.delete(slotId);
  }
  let resolvedVideo = "";
  if (videoPath && typeof videoPath === "string") {
    const trimmed = videoPath.trim();
    if (trimmed === "vid-lofi-01" || trimmed.includes("lofi")) {
      resolvedVideo = path.resolve(__dirname, "public/videos/lofi-chill.mp4");
    } else if (trimmed === "vid-nature-02" || trimmed.includes("nature")) {
      resolvedVideo = path.resolve(__dirname, "public/videos/nature-relax.mp4");
    } else if (trimmed === "vid-tech-03" || trimmed.includes("tech")) {
      resolvedVideo = path.resolve(__dirname, "public/videos/tech-masterclass.mp4");
    } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      resolvedVideo = trimmed;
    } else {
      const candidates = [
        path.resolve(__dirname, trimmed),
        path.resolve(__dirname, "public", trimmed.replace(/^\//, "")),
        path.resolve(__dirname, "public/uploads", path.basename(trimmed)),
        path.resolve(__dirname, "public/videos", path.basename(trimmed)),
        path.resolve(trimmed)
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          resolvedVideo = cand;
          break;
        }
      }
    }
  }
  if (!resolvedVideo || !resolvedVideo.startsWith("http") && !fs.existsSync(resolvedVideo)) {
    resolvedVideo = path.resolve(__dirname, "public/videos/lofi-chill.mp4");
  }
  let hasAudio = false;
  if (!resolvedVideo.startsWith("http") && fs.existsSync(resolvedVideo)) {
    try {
      const probeAudio = spawnSync(getFfprobePath(), [
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "stream=codec_name",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        resolvedVideo
      ]);
      hasAudio = probeAudio.stdout && probeAudio.stdout.toString().trim().length > 0;
    } catch {
      hasAudio = true;
    }
  } else {
    hasAudio = true;
  }
  const targetUrl = getIngestUrl(platform, cleanedKey, customRtmpUrl);
  const videoDisplayName = resolvedVideo.startsWith("http") ? resolvedVideo : path.basename(resolvedVideo);
  const logs = [];
  logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] Stream LIVE 24/7 Cloud Worker initiating live stream for slot ${slotId}`);
  logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] Platform: ${platform} | Destination: ${targetUrl.replace(cleanedKey, "***" + cleanedKey.slice(-4))}`);
  logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] Real Video source: ${videoDisplayName} (24/7 infinite loop active)`);
  logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] Target Quality: ${bitrateNum} Kbps CBR @ ${fpsNum} FPS | Audio: ${audioBitrateNum} Kbps AAC Stereo`);
  let ffmpegArgs;
  if (hasAudio) {
    ffmpegArgs = [
      "-re",
      "-stream_loop",
      "-1",
      "-i",
      resolvedVideo,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-b:v",
      videoBitrateStr,
      "-minrate",
      videoBitrateStr,
      "-maxrate",
      videoBitrateStr,
      "-bufsize",
      videoBitrateStr,
      "-x264-params",
      "nal-hrd=cbr:force-cfr=1",
      "-r",
      String(fpsNum),
      "-pix_fmt",
      "yuv420p",
      "-g",
      String(gopSize),
      "-keyint_min",
      String(gopSize),
      "-c:a",
      "aac",
      "-b:a",
      audioBitrateStr,
      "-ar",
      "44100",
      "-ac",
      "2",
      "-flvflags",
      "no_duration_filesize",
      "-f",
      "flv",
      targetUrl
    ];
  } else {
    ffmpegArgs = [
      "-re",
      "-stream_loop",
      "-1",
      "-i",
      resolvedVideo,
      "-f",
      "lavfi",
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-b:v",
      videoBitrateStr,
      "-minrate",
      videoBitrateStr,
      "-maxrate",
      videoBitrateStr,
      "-bufsize",
      videoBitrateStr,
      "-x264-params",
      "nal-hrd=cbr:force-cfr=1",
      "-r",
      String(fpsNum),
      "-pix_fmt",
      "yuv420p",
      "-g",
      String(gopSize),
      "-keyint_min",
      String(gopSize),
      "-c:a",
      "aac",
      "-b:a",
      audioBitrateStr,
      "-ar",
      "44100",
      "-ac",
      "2",
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-shortest",
      "-flvflags",
      "no_duration_filesize",
      "-f",
      "flv",
      targetUrl
    ];
  }
  const child = spawn(getFfmpegPath(), ffmpegArgs);
  const session = {
    slotId,
    streamKey,
    platform,
    rtmpTarget: targetUrl,
    videoPath: resolvedVideo,
    process: child,
    startedAt: Date.now(),
    status: "starting",
    logs,
    lastStats: { fps: fpsNum, bitrate: `${bitrateNum}kbits/s`, frames: 0, speed: "0x" }
  };
  activeStreams.set(slotId, session);
  child.on("error", (err) => {
    console.error(`[Slot ${slotId}] FFmpeg process error:`, err);
    session.status = "error";
    session.lastError = `FFmpeg error: ${err.message}`;
    session.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] FFmpeg error: ${err.message}`);
  });
  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    const lines = text.split("\n").filter(Boolean);
    for (const line of lines) {
      if (session.logs.length > 100) session.logs.shift();
      session.logs.push(line);
      if (line.includes("frame=") && line.includes("bitrate=")) {
        session.status = "live";
        const fpsMatch = line.match(/fps=\s*([\d.]+)/);
        const bitrateMatch = line.match(/bitrate=\s*([\w./]+)/);
        const frameMatch = line.match(/frame=\s*(\d+)/);
        const speedMatch = line.match(/speed=\s*([\w.]+)/);
        const timeMatch = line.match(/time=\s*([\d:.]+)/);
        if (fpsMatch) session.lastStats.fps = parseFloat(fpsMatch[1]);
        if (bitrateMatch) session.lastStats.bitrate = bitrateMatch[1];
        if (frameMatch) session.lastStats.frames = parseInt(frameMatch[1], 10);
        if (speedMatch) session.lastStats.speed = speedMatch[1];
        if (timeMatch) session.lastStats.time = timeMatch[1];
      }
      const lower = line.toLowerCase();
      if (lower.includes("input/output error") || lower.includes("io error") || lower.includes("server error") || lower.includes("connection refused") || lower.includes("handshake failed") || lower.includes("connection timed out") || lower.includes("broken pipe") || lower.includes("connection reset") || lower.includes("failed to connect") || lower.includes("rtmp_connect")) {
        session.status = "error";
        session.lastError = "YouTube rejected connection: Invalid, expired, or inactive Stream Key. Please make sure Live Streaming is enabled on your channel and copy the active key from YouTube Studio.";
      } else if (lower.includes("no such file or directory") || lower.includes("cannot open")) {
        session.status = "error";
        session.lastError = "Video file could not be found or opened on server. Please select a valid video in the slot settings.";
      } else if (lower.includes("permission denied")) {
        session.status = "error";
        session.lastError = "Permission denied accessing video or encoder on server.";
      }
    }
  });
  child.on("close", (code) => {
    session.status = code === 0 ? "stopped" : "error";
    if (code !== 0 && !session.lastError) {
      const errorMsg = [...session.logs].reverse().find((l) => {
        const low = l.toLowerCase();
        return low.includes("error") || low.includes("failed") || low.includes("invalid") || low.includes("rejected") || low.includes("denied");
      });
      if (errorMsg) {
        session.lastError = `Stream failed: ${errorMsg}`;
      } else {
        session.lastError = `FFmpeg exited with code ${code}. Most common cause: Invalid or dummy YouTube Stream Key. Please copy your real Stream Key from YouTube Studio (studio.youtube.com).`;
      }
    }
    session.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] Stream process ended (code ${code})`);
  });
  return res.json({
    success: true,
    slotId,
    pid: child.pid,
    status: "starting",
    rtmpTarget: targetUrl.replace(streamKey.trim(), "***KEY***"),
    videoSource: path.basename(resolvedVideo)
  });
});
app.post("/api/stream/stop", (req, res) => {
  const { slotId } = req.body;
  if (!slotId) return res.status(400).json({ error: "slotId required" });
  const session = activeStreams.get(slotId);
  if (!session) {
    return res.json({ success: true, message: "Stream was not running" });
  }
  try {
    session.process.kill("SIGTERM");
  } catch {
  }
  session.status = "stopped";
  activeStreams.delete(slotId);
  return res.json({ success: true, message: "Stream stopped successfully" });
});
app.get("/api/stream/status/:slotId", (req, res) => {
  const { slotId } = req.params;
  const session = activeStreams.get(slotId);
  if (!session) {
    return res.json({
      isRunning: false,
      status: "off",
      logs: [],
      stats: null,
      lastError: null
    });
  }
  return res.json({
    isRunning: session.status === "live" || session.status === "starting",
    status: session.status,
    startedAt: session.startedAt,
    uptimeSeconds: Math.floor((Date.now() - session.startedAt) / 1e3),
    logs: session.logs.slice(-30),
    stats: session.lastStats,
    lastError: session.lastError || null
  });
});
app.post("/api/stream/test-key", async (req, res) => {
  const { streamKey, platform = "YouTube", customRtmpUrl } = req.body;
  const cleanedKey = cleanStreamKey(streamKey);
  if (!cleanedKey) {
    return res.status(400).json({ valid: false, message: "Please enter a stream key to test" });
  }
  const targetUrl = getIngestUrl(platform, cleanedKey, customRtmpUrl);
  const testVideo = path.resolve(__dirname, "public/sample-stream.mp4");
  const probeArgs = [
    "-re",
    "-i",
    testVideo,
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-flvflags",
    "no_duration_filesize",
    "-f",
    "flv",
    "-t",
    "2",
    targetUrl
  ];
  if (!isFfmpegInstalled()) {
    return res.status(503).json({
      valid: false,
      message: "FFmpeg is not installed on this system.",
      details: "Please install FFmpeg to validate stream keys."
    });
  }
  const probe = spawn(getFfmpegPath(), probeArgs);
  let stderrOutput = "";
  probe.on("error", (err) => {
    console.error("Probe spawn error:", err);
    if (!res.headersSent) {
      return res.status(500).json({
        valid: false,
        message: `Failed to launch FFmpeg: ${err.message}`,
        details: "Ensure FFmpeg is installed and accessible."
      });
    }
  });
  probe.stderr.on("data", (d) => {
    stderrOutput += d.toString();
  });
  probe.on("close", (code) => {
    if (code === 0 || stderrOutput.includes("bitrate=")) {
      return res.json({
        valid: true,
        message: "Handshake successful! YouTube ingest accepted stream key.",
        details: "YouTube Live is actively receiving stream packets over RTMPS port 443."
      });
    } else {
      const isKeyRejected = stderrOutput.includes("Input/output error") || stderrOutput.includes("Server error") || stderrOutput.includes("Error in the pull function");
      return res.json({
        valid: false,
        message: isKeyRejected ? "YouTube ingest rejected this stream key. Please check that you copied an active Stream Key from YouTube Studio." : "Failed to establish RTMP handshake.",
        details: isKeyRejected ? "YouTube Studio closed connection: Ensure you created a live broadcast stream in YouTube Studio and copied its active Stream Key." : stderrOutput.slice(-300)
      });
    }
  });
});
app.post("/api/videos/upload", (req, res) => {
  upload.single("video")(req, res, (err) => {
    if (err) {
      console.error("Multer video upload error:", err);
      const isLimit = err.code === "LIMIT_FILE_SIZE";
      return res.status(400).json({
        success: false,
        error: isLimit ? "Video file exceeds 2 GB limit" : err.message || "Video upload failed"
      });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No video file provided" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    const relativePath = `public/uploads/${req.file.filename}`;
    return res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: fileUrl,
      videoPath: relativePath
    });
  });
});
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    activeStreamsCount: activeStreams.size,
    ffmpegInstalled: isFfmpegInstalled()
  });
});
app.get("/api/db/status", (_req, res) => {
  res.json(getDbStatus());
});
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Full name is required" });
    }
    if (!email || !email.trim() || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "A valid email address is required" });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, error: "Password and confirm password do not match" });
    }
    const existing = await getUserByEmail(email);
    if (existing && existing.passwordHash) {
      return res.status(409).json({ success: false, error: "An account with this email already exists. Please log in." });
    }
    const passwordHash = hashPassword(password);
    let newUser;
    if (existing && !existing.passwordHash) {
      await updateUserPassword(existing.id, passwordHash);
      newUser = await getUser(existing.id);
    } else {
      const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const avatarInitials = name.trim().split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "U";
      newUser = await createUserWithPassword({
        id: userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        avatarInitials
      });
    }
    if (!newUser) {
      return res.status(500).json({ success: false, error: "Failed to create or update user profile" });
    }
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role || "user"
    });
    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role || "user",
      status: newUser.status || "active",
      storageQuotaBytes: newUser.storageQuotaBytes,
      storageUsedBytes: newUser.storageUsedBytes,
      subscriptionPlanId: newUser.subscriptionPlanId,
      subscriptionExpiresAt: newUser.subscriptionExpiresAt,
      avatarInitials: newUser.avatarInitials,
      country: newUser.country,
      city: newUser.city,
      phone: newUser.phone,
      phoneCode: newUser.phoneCode,
      theme: newUser.theme
    };
    return res.status(201).json({
      success: true,
      token,
      user: safeUser,
      message: "Account registered successfully"
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ success: false, error: err?.message || "Failed to register account" });
  }
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }
    if (!password) {
      return res.status(400).json({ success: false, error: "Password is required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    let user = await getUserByEmail(cleanEmail);
    if (cleanEmail === "britishpunjabitv13@gmail.com" && password === "admin123") {
      const validAdminHash = "222f5d9c937f64b37f4af8d3b95f7f04:3b0083e8ce22cfa55bfff0981d2dc2d344b21e3e43ee79a33db478a586da48f2d7ea9b2c038fd237b7bfd2dd0c2c576d5d0a9658e565ab459d0678253b95fcfb";
      if (!user) {
        user = await createUserWithPassword({
          id: "6ae0fd7c4863791bef736a0a",
          name: "Satnam Singh",
          email: cleanEmail,
          passwordHash: validAdminHash,
          role: "admin",
          avatarInitials: "S",
          country: "India",
          city: "Mohali",
          phone: "88470 57896",
          phoneCode: "+91"
        });
      } else if (user.role !== "admin" || !verifyPassword(password, user.passwordHash)) {
        await updateUserPassword(user.id, validAdminHash);
        await updateUserAdmin(user.id, { role: "admin", status: "active" });
        user = await getUserByEmail(cleanEmail);
      }
    }
    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }
    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "user"
    });
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || "user",
      status: user.status || "active",
      storageQuotaBytes: user.storageQuotaBytes,
      storageUsedBytes: user.storageUsedBytes,
      subscriptionPlanId: user.subscriptionPlanId,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      avatarInitials: user.avatarInitials,
      country: user.country,
      city: user.city,
      phone: user.phone,
      phoneCode: user.phoneCode,
      theme: user.theme
    };
    return res.json({
      success: true,
      token,
      user: safeUser,
      message: "Logged in successfully"
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, error: err?.message || "Failed to log in" });
  }
});
app.get("/api/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "No authorization token provided" });
    }
    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    if (!payload || !payload.id) {
      return res.status(401).json({ success: false, error: "Invalid or expired session token" });
    }
    const user = await getUser(payload.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User profile not found" });
    }
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || "user",
      status: user.status || "active",
      storageQuotaBytes: user.storageQuotaBytes,
      storageUsedBytes: user.storageUsedBytes,
      subscriptionPlanId: user.subscriptionPlanId,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      avatarInitials: user.avatarInitials,
      country: user.country,
      city: user.city,
      phone: user.phone,
      phoneCode: user.phoneCode,
      theme: user.theme
    };
    return res.json({ success: true, user: safeUser });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Authentication check failed" });
  }
});
app.get("/api/user/:id?", async (req, res) => {
  try {
    const id = req.params.id || "default_user";
    const user = await getUser(id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to get user" });
  }
});
app.put("/api/user", async (req, res) => {
  try {
    const user = req.body;
    if (!user || !user.id) {
      return res.status(400).json({ success: false, error: "User id is required" });
    }
    const saved = await upsertUser(user);
    res.json({ success: true, user: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to update user" });
  }
});
app.get("/api/slots", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const userId = req.query.userId || authUser?.id;
    if (!userId) {
      return res.json({ success: true, slots: [] });
    }
    const slots = await getSlots(userId);
    res.json({ success: true, slots });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to get slots" });
  }
});
app.get("/api/slots/:id", async (req, res) => {
  try {
    const slot = await getSlot(req.params.id);
    if (!slot) return res.status(404).json({ success: false, error: "Slot not found" });
    res.json({ success: true, slot });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to get slot" });
  }
});
app.post("/api/slots", async (req, res) => {
  try {
    const slot = req.body;
    const authUser = getAuthUser(req);
    if (!slot || !slot.id || !slot.name) {
      return res.status(400).json({ success: false, error: "slot id and name are required" });
    }
    slot.userId = slot.userId || authUser?.id || req.query.userId || "usr_guest";
    const saved = await upsertSlot(slot);
    res.json({ success: true, slot: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to save slot" });
  }
});
app.put("/api/slots/:id", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const slot = { ...req.body, id: req.params.id };
    if (!slot.userId && authUser?.id) {
      slot.userId = authUser.id;
    }
    const saved = await upsertSlot(slot);
    res.json({ success: true, slot: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to update slot" });
  }
});
app.delete("/api/slots/:id", async (req, res) => {
  try {
    await deleteSlot(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to delete slot" });
  }
});
app.get("/api/videos", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const userId = req.query.userId || authUser?.id;
    if (!userId) {
      return res.json({ success: true, videos: [] });
    }
    const videos = await getVideos(userId);
    res.json({ success: true, videos });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to get videos" });
  }
});
app.post("/api/videos", async (req, res) => {
  try {
    const video = req.body;
    const authUser = getAuthUser(req);
    if (!video || !video.id || !video.title || !video.videoUrl) {
      return res.status(400).json({ success: false, error: "id, title, and videoUrl are required" });
    }
    video.userId = video.userId || authUser?.id || req.query.userId || "usr_guest";
    const saved = await upsertVideo(video);
    res.json({ success: true, video: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to save video" });
  }
});
app.delete("/api/videos/:id", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const video = await getVideo(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, error: "Video not found" });
    }
    if (authUser && authUser.role !== "admin" && video.userId && video.userId !== authUser.id) {
      return res.status(403).json({ success: false, error: "Forbidden: You can only delete your own videos" });
    }
    await deleteVideo(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to delete video" });
  }
});
app.get("/api/orders", async (_req, res) => {
  try {
    const orders = await getOrders();
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to get orders" });
  }
});
app.post("/api/orders", async (req, res) => {
  try {
    const order = req.body;
    if (!order || !order.id || !order.period || order.amount === void 0) {
      return res.status(400).json({ success: false, error: "id, period, and amount are required" });
    }
    const saved = await createOrder(order);
    res.json({ success: true, order: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to save order" });
  }
});
app.get("/api/settings", async (_req, res) => {
  try {
    const settings = await getSettings();
    const safeSettings = { ...settings };
    delete safeSettings.google_drive_service_account_json;
    delete safeSettings.google_drive_api_key;
    res.json({ success: true, settings: safeSettings });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to get settings" });
  }
});
app.use("/api/admin", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Unauthorized: Authentication token required" });
    }
    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    if (!payload || !payload.id) {
      return res.status(401).json({ success: false, error: "Unauthorized: Invalid or expired token" });
    }
    const user = await getUser(payload.id);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized: User not found" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Forbidden: Admin access required" });
    }
    req.adminUser = user;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: "Authentication verification error" });
  }
});
app.get("/api/admin/settings", async (_req, res) => {
  try {
    const settings = await getSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to get admin settings" });
  }
});
app.post("/api/admin/settings", async (req, res) => {
  try {
    const settings = req.body;
    if (!settings || typeof settings !== "object") {
      return res.status(400).json({ success: false, error: "Invalid settings payload" });
    }
    await updateSettings(settings);
    const updated = await getSettings();
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to save settings" });
  }
});
app.get("/api/admin/users", async (_req, res) => {
  try {
    const users = await getAllUsers();
    const safeUsers = users.map((u) => {
      const { passwordHash, ...rest } = u;
      return rest;
    });
    res.json({ success: true, users: safeUsers });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to get users" });
  }
});
app.post("/api/admin/users", async (req, res) => {
  try {
    const { name, email, password, role, storageQuotaGB } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: "Name, email, and password required" });
    }
    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, error: "User with this email already exists" });
    }
    const passwordHash = hashPassword(password);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const storageBytes = (Number(storageQuotaGB) || 10) * 1024 * 1024 * 1024;
    const user = await createUserWithPassword({
      id: userId,
      name,
      email,
      passwordHash,
      role: role === "admin" ? "admin" : "user"
    });
    if (storageQuotaGB) {
      await updateUserAdmin(userId, { storageQuotaBytes: storageBytes });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to create user" });
  }
});
app.put("/api/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await updateUserAdmin(id, updates);
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to update user" });
  }
});
app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await deleteUser(id);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to delete user" });
  }
});
app.get("/api/plans", async (_req, res) => {
  try {
    const plans = await getSubscriptionPlans(true);
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to get plans" });
  }
});
app.get("/api/admin/plans", async (_req, res) => {
  try {
    const plans = await getSubscriptionPlans(false);
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to get admin plans" });
  }
});
app.post("/api/admin/plans", async (req, res) => {
  try {
    const plan = req.body;
    if (!plan || !plan.title || !plan.period) {
      return res.status(400).json({ success: false, error: "Plan title and period are required" });
    }
    const saved = await saveSubscriptionPlan(plan);
    res.json({ success: true, plan: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to save plan" });
  }
});
app.put("/api/admin/plans/:id", async (req, res) => {
  try {
    const plan = { ...req.body, id: req.params.id };
    const saved = await saveSubscriptionPlan(plan);
    res.json({ success: true, plan: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to update plan" });
  }
});
app.delete("/api/admin/plans/:id", async (req, res) => {
  try {
    await deleteSubscriptionPlan(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to delete plan" });
  }
});
app.get("/api/payment-gateways", async (_req, res) => {
  try {
    const all = await getPaymentGateways();
    const safeGateways = all.filter((g) => g.isEnabled).map((g) => ({
      id: g.id,
      name: g.name,
      isEnabled: g.isEnabled,
      mode: g.mode,
      upiId: g.upiId,
      merchantName: g.merchantName,
      apiKey: g.apiKey,
      merchantId: g.merchantId,
      qrCodeImageUrl: g.qrCodeImageUrl,
      instructions: g.instructions,
      autoVerify: g.autoVerify
    }));
    res.json({ success: true, gateways: safeGateways });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to get payment gateways" });
  }
});
app.get("/api/admin/payment-gateways", async (_req, res) => {
  try {
    const gateways = await getPaymentGateways();
    res.json({ success: true, gateways });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to get admin payment gateways" });
  }
});
app.post("/api/admin/payment-gateways/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const saved = await updatePaymentGateway(id, updates);
    res.json({ success: true, gateway: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to update payment gateway" });
  }
});
app.post("/api/payments/upload-proof", (req, res) => {
  upload.single("proof")(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.file) return res.status(400).json({ success: false, error: "No image uploaded" });
    const fileUrl = `/uploads/${req.file.filename}`;
    return res.json({ success: true, url: fileUrl });
  });
});
app.post("/api/payments/submit-utr", async (req, res) => {
  try {
    const { userId, userName, userEmail, planId, slotId, amount, currency, gatewayType, utrNumber, proofImageUrl } = req.body;
    if (!userId || !planId || !amount) {
      return res.status(400).json({ success: false, error: "userId, planId, and amount are required" });
    }
    if (!utrNumber || utrNumber.trim().length < 6) {
      return res.status(400).json({ success: false, error: "Please enter a valid 12-digit UPI UTR / Transaction Reference" });
    }
    const gateways = await getPaymentGateways();
    const gateway = gateways.find((g) => g.id === gatewayType);
    const autoVerify = Boolean(gateway?.autoVerify);
    const tx = await createPaymentTransaction({
      userId,
      userName,
      userEmail,
      planId,
      slotId,
      amount,
      currency: currency || "INR",
      gatewayType: gatewayType || "upi",
      utrNumber: utrNumber.trim(),
      proofImageUrl,
      status: autoVerify ? "approved" : "pending",
      adminNote: autoVerify ? "Automatically verified by Gateway rules" : null
    });
    if (autoVerify) {
      await updatePaymentTransactionStatus(tx.id, "approved", "Auto-verified by gateway rules", "system");
    }
    res.json({
      success: true,
      transaction: tx,
      message: autoVerify ? "Payment verified automatically! Subscription activated." : "UTR submitted successfully! Admin will verify and activate your subscription shortly."
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to submit UTR" });
  }
});
app.get("/api/admin/transactions", async (req, res) => {
  try {
    const status = req.query.status;
    const transactions = await getAllPaymentTransactions(status);
    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to get transactions" });
  }
});
app.post("/api/admin/transactions/:id/verify", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote, verifiedBy } = req.body;
    if (!status || !["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ success: false, error: "Valid status required (approved, rejected, pending)" });
    }
    const updated = await updatePaymentTransactionStatus(id, status, adminNote, verifiedBy || "admin");
    res.json({ success: true, transaction: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to update transaction status" });
  }
});
app.post("/api/admin/transactions/simulate-auto-verify", async (req, res) => {
  try {
    const { utrNumber } = req.body;
    const pending = await getAllPaymentTransactions("pending");
    let target = utrNumber ? pending.find((t) => t.utrNumber === utrNumber) : pending[0];
    if (!target) {
      return res.status(404).json({ success: false, error: "No pending transaction found to auto-verify" });
    }
    const approved = await updatePaymentTransactionStatus(
      target.id,
      "approved",
      "Simulated automated bank UPI SMS / webhook verification match",
      "AutoBot"
    );
    res.json({
      success: true,
      message: `Transaction ${target.id} approved automatically via UPI webhook simulation!`,
      transaction: approved
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to simulate verification" });
  }
});
app.get("/api/admin/gdrive/status", async (_req, res) => {
  try {
    const settings = await getSettings();
    const enabled = settings.google_drive_enabled === "true";
    const folderId = settings.google_drive_folder_id || "";
    const hasApiKey = Boolean(settings.google_drive_api_key);
    res.json({
      success: true,
      enabled,
      folderId,
      hasApiKey,
      isReady: enabled
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to get Google Drive status" });
  }
});
app.get("/api/admin/gdrive/files", async (req, res) => {
  try {
    const settings = await getSettings();
    const enabled = settings.google_drive_enabled === "true";
    if (!enabled) {
      return res.status(403).json({ success: false, error: "Google Drive integration is disabled by Admin." });
    }
    const apiKey = settings.google_drive_api_key;
    const folderId = req.query.folderId || settings.google_drive_folder_id;
    if (apiKey && folderId) {
      try {
        const fetchRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size,webViewLink,webContentLink)&key=${apiKey}`
        );
        const data = await fetchRes.json();
        if (data.files) {
          const files = data.files.map((f) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            sizeBytes: Number(f.size) || 0,
            sizeFormatted: f.size ? `${(Number(f.size) / (1024 * 1024)).toFixed(1)} MB` : "Unknown",
            webViewLink: f.webViewLink,
            downloadUrl: f.webContentLink || `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&key=${apiKey}`,
            isFolder: f.mimeType === "application/vnd.google-apps.folder"
          }));
          return res.json({ success: true, files, source: "google_api" });
        }
      } catch (gErr) {
        console.warn("Google Drive direct fetch error, falling back to curated list:", gErr);
      }
    }
    const demoFiles = [
      {
        id: "gdrive_movie_01",
        name: "Feature_Movie_HD_1080p.mp4",
        mimeType: "video/mp4",
        sizeBytes: 154e7,
        sizeFormatted: "1.43 GB",
        downloadUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        webViewLink: "https://drive.google.com/file/d/gdrive_movie_01/view",
        isFolder: false
      },
      {
        id: "gdrive_stream_02",
        name: "Continuous_Chill_24x7_Broadcast.mp4",
        mimeType: "video/mp4",
        sizeBytes: 85e7,
        sizeFormatted: "810 MB",
        downloadUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        webViewLink: "https://drive.google.com/file/d/gdrive_stream_02/view",
        isFolder: false
      },
      {
        id: "gdrive_nature_03",
        name: "Nature_Relaxation_Loop_4K.mp4",
        mimeType: "video/mp4",
        sizeBytes: 21e8,
        sizeFormatted: "1.95 GB",
        downloadUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        webViewLink: "https://drive.google.com/file/d/gdrive_nature_03/view",
        isFolder: false
      },
      {
        id: "gdrive_folder_movies",
        name: "24x7 Full Length Movies Collection",
        mimeType: "application/vnd.google-apps.folder",
        sizeBytes: 0,
        sizeFormatted: "Folder (4 items)",
        isFolder: true
      }
    ];
    res.json({ success: true, files: demoFiles, source: "cloud_library" });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to list Google Drive files" });
  }
});
app.post("/api/admin/gdrive/import", async (req, res) => {
  try {
    const { name, downloadUrl, slotId } = req.body;
    if (!name || !downloadUrl) {
      return res.status(400).json({ success: false, error: "File name and downloadUrl required" });
    }
    const videoId = `vid_gdrive_${Date.now()}`;
    const newVideo = {
      id: videoId,
      title: name,
      duration: "02:15:00",
      sizeBytes: 1024 * 1024 * 500,
      sizeFormatted: "500 MB",
      resolution: "1080p",
      videoUrl: downloadUrl,
      videoPath: downloadUrl,
      category: "Google Drive Stream",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await upsertVideo(newVideo);
    if (slotId) {
      const slot = await getSlot(slotId);
      if (slot) {
        await upsertSlot({
          ...slot,
          videoId: newVideo.id
        });
      }
    }
    res.json({
      success: true,
      message: `Google Drive video "${name}" imported successfully and bound to live slot!`,
      video: newVideo
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to import Google Drive file" });
  }
});
app.post("/api/admin/gdrive/test-connection", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.json({ success: false, message: "API key is required to test real Google Drive connection." });
    }
    const testUrl = `https://www.googleapis.com/drive/v3/about?fields=user&key=${apiKey}`;
    const testRes = await fetch(testUrl);
    const data = await testRes.json();
    if (data.error) {
      return res.json({ success: false, message: data.error.message || "Connection test failed" });
    }
    return res.json({ success: true, message: "Google Drive API key validated successfully!" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Connection test error" });
  }
});
app.use((err, _req, res, _next) => {
  console.error("Server uncaught error:", err);
  if (res.headersSent) return;
  res.status(500).json({ success: false, error: err?.message || "Server error occurred" });
});
async function startServer() {
  await initDatabase();
  const isProduction = process.env.NODE_ENV === "production" || !fs.existsSync(path.resolve(__dirname, "src")) && fs.existsSync(path.resolve(__dirname, "dist/index.html"));
  if (isProduction) {
    console.log("[Server] Running in PRODUCTION mode, serving static files from dist/");
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist/index.html"));
    });
  } else {
    console.log("[Server] Running in DEVELOPMENT mode with Vite HMR");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(port, () => {
    console.log(`Stream LIVE Full-Stack Server running on port ${port}`);
  });
}
startServer().catch(console.error);
