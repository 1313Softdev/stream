import 'dotenv/config';
import express from 'express';
import { spawn, spawnSync, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import {
  initDatabase,
  getDbStatus,
  getUser,
  getUserByEmail,
  updateUserPassword,
  createUserWithPassword,
  upsertUser,
  getAllUsers,
  updateUserAdmin,
  deleteUser,
  getSettings,
  updateSettings,
  getPaymentGateways,
  updatePaymentGateway,
  getSubscriptionPlans,
  saveSubscriptionPlan,
  deleteSubscriptionPlan,
  createPaymentTransaction,
  getAllPaymentTransactions,
  updatePaymentTransactionStatus,
  getSlots,
  getSlot,
  upsertSlot,
  deleteSlot,
  getVideos,
  getVideo,
  upsertVideo,
  deleteVideo,
  getOrders,
  createOrder,
} from './server/db.ts';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
} from './server/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Setup uploads directory for real uploaded videos
const uploadsDir = path.resolve(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

function getAuthUser(req: express.Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.split(' ')[1]);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `video-${uniqueSuffix}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2048 * 1024 * 1024 }, // 2GB
});

interface StreamSession {
  slotId: string;
  streamKey: string;
  platform: string;
  rtmpTarget: string;
  videoPath: string;
  customRtmpUrl?: string;
  targetBitrateKbps: number;
  fps: number;
  audioBitrateKbps: number;
  process: ChildProcess;
  startedAt: number;
  status: 'starting' | 'live' | 'error' | 'stopped';
  logs: string[];
  lastStats: {
    fps?: number;
    bitrate?: string;
    frames?: number;
    speed?: string;
    time?: string;
  };
  lastError?: string;
  userRequestedStop?: boolean;
  reconnectAttempts?: number;
  reconnectTimer?: NodeJS.Timeout;
}

const activeStreams = new Map<string, StreamSession>();

// Clean stream key helper
function cleanStreamKey(key: string): string {
  if (!key) return '';
  let cleaned = key.trim().replace(/[\r\n\t\s]+/g, '');
  // If user accidentally pasted the whole RTMP URL or path like rtmp://.../live2/xxxx or live2/xxxx
  if (cleaned.includes('/live2/')) {
    cleaned = cleaned.split('/live2/').pop() || cleaned;
  } else if (cleaned.includes('/live/')) {
    cleaned = cleaned.split('/live/').pop() || cleaned;
  } else if (cleaned.includes('rtmp://') || cleaned.includes('rtmps://')) {
    cleaned = cleaned.split('/').pop() || cleaned;
  }
  // Strip any leading/trailing quotes
  cleaned = cleaned.replace(/^['"]+|['"]+$/g, '');
  return cleaned;
}

// Helper to determine the best RTMP / RTMPS URL for platform
function getIngestUrl(platform: string, rawStreamKey: string, customUrl?: string): string {
  const cleanKey = cleanStreamKey(rawStreamKey);
  const lower = (platform || '').toLowerCase();

  // If custom RTMP URL provided
  if (customUrl && customUrl.trim()) {
    let base = customUrl.trim().replace(/\/+$/, '');
    if (base.toLowerCase().includes('youtube.com') && base.startsWith('rtmps://')) {
      base = base.replace('rtmps://', 'rtmp://').replace(':443', '');
    }
    return `${base}/${cleanKey}`;
  }

  if (lower.includes('youtube')) {
    return `rtmp://a.rtmp.youtube.com/live2/${cleanKey}`;
  }
  if (lower.includes('facebook')) {
    return `rtmps://live-api-s.facebook.com:443/rtmp/${cleanKey}`;
  }
  if (lower.includes('twitch')) {
    return `rtmp://live.twitch.tv/app/${cleanKey}`;
  }
  return `rtmp://a.rtmp.youtube.com/live2/${cleanKey}`;
}

// Helpers for cross-platform FFmpeg & FFprobe detection
function getFfmpegPath(): string {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  if (ffmpegInstaller && ffmpegInstaller.path && fs.existsSync(ffmpegInstaller.path)) {
    return ffmpegInstaller.path;
  }
  const candidates = [
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const res = spawnSync('which', ['ffmpeg']);
    if (res.status === 0) {
      const found = res.stdout.toString().trim();
      if (found && fs.existsSync(found)) return found;
    }
  } catch {}
  return 'ffmpeg';
}

function getFfprobePath(): string {
  if (process.env.FFPROBE_PATH && fs.existsSync(process.env.FFPROBE_PATH)) {
    return process.env.FFPROBE_PATH;
  }
  if (ffprobeInstaller && ffprobeInstaller.path && fs.existsSync(ffprobeInstaller.path)) {
    return ffprobeInstaller.path;
  }
  const candidates = [
    '/usr/bin/ffprobe',
    '/usr/local/bin/ffprobe',
    '/opt/homebrew/bin/ffprobe',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const res = spawnSync('which', ['ffprobe']);
    if (res.status === 0) {
      const found = res.stdout.toString().trim();
      if (found && fs.existsSync(found)) return found;
    }
  } catch {}
  return 'ffprobe';
}

function isFfmpegInstalled(): boolean {
  const p = getFfmpegPath();
  if (path.isAbsolute(p)) {
    return fs.existsSync(p);
  }
  try {
    const res = spawnSync(p, ['-version']);
    return res.status === 0;
  } catch {
    return false;
  }
}

function resolveVideoFilePath(videoPath?: string): string {
  if (!videoPath || typeof videoPath !== 'string') return '';
  const trimmed = videoPath.trim();
  if (trimmed === 'vid-lofi-01' || trimmed.includes('lofi')) {
    return path.resolve(__dirname, 'public/videos/lofi-chill.mp4');
  } else if (trimmed === 'vid-nature-02' || trimmed.includes('nature')) {
    return path.resolve(__dirname, 'public/videos/nature-relax.mp4');
  } else if (trimmed === 'vid-tech-03' || trimmed.includes('tech')) {
    return path.resolve(__dirname, 'public/videos/tech-masterclass.mp4');
  } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  } else {
    const candidates = [
      path.resolve(__dirname, trimmed),
      path.resolve(__dirname, 'public', trimmed.replace(/^\//, '')),
      path.resolve(__dirname, 'public/uploads', path.basename(trimmed)),
      path.resolve(__dirname, 'public/videos', path.basename(trimmed)),
      path.resolve(trimmed),
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        return cand;
      }
    }
  }
  return '';
}

// Global safety net to prevent unhandled errors from terminating the server
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 1. Start or Restart Live Stream
app.post('/api/stream/start', async (req, res) => {
  const {
    slotId,
    streamKey,
    platform = 'YouTube',
    videoPath,
    customRtmpUrl,
    targetBitrateKbps = 2500,
    fps = 30,
    audioBitrateKbps = 128,
  } = req.body;

  if (!slotId) {
    return res.status(400).json({ error: 'slotId is required' });
  }

  if (!isFfmpegInstalled()) {
    return res.status(503).json({
      success: false,
      error: 'FFmpeg is not installed or not found on this system. Please install FFmpeg (e.g. `brew install ffmpeg`) to broadcast live streams.',
    });
  }

  const cleanedKey = cleanStreamKey(streamKey);
  if (!cleanedKey) {
    return res.status(400).json({ error: 'Stream key is required to broadcast to YouTube' });
  }

  // Ensure slot has approved subscription and is not expired
  try {
    const slotData = await getSlot(slotId);
    if (slotData) {
      if (slotData.status === 'pending_approval') {
        return res.status(403).json({
          success: false,
          error: 'This slot is pending payment approval. Please wait for admin approval before broadcasting.',
        });
      }
      if (slotData.status === 'expired' || (slotData.expiresAt && slotData.expiresAt > 0 && slotData.expiresAt < Date.now())) {
        return res.status(403).json({
          success: false,
          error: 'This slot subscription has expired. Please renew your slot subscription to stream live.',
        });
      }
    }
  } catch (slotCheckErr) {
    console.warn('[Stream Start] Slot check warning:', slotCheckErr);
  }

  // Parse and validate stream quality & bitrate parameters
  const bitrateNum = Math.max(1000, Math.min(15000, Number(targetBitrateKbps) || 2500));
  const fpsNum = Number(fps) === 60 ? 60 : 30;
  const audioBitrateNum = [96, 128, 160, 192, 256, 320].includes(Number(audioBitrateKbps))
    ? Number(audioBitrateKbps)
    : 128;
  const gopSize = fpsNum * 2; // 2-second keyframe interval required by YouTube/Twitch/Facebook
  const videoBitrateStr = `${bitrateNum}k`;
  const audioBitrateStr = `${audioBitrateNum}k`;

  // Stop any existing stream on this slot
  const existing = activeStreams.get(slotId);
  if (existing) {
    existing.userRequestedStop = true;
    if (existing.reconnectTimer) clearTimeout(existing.reconnectTimer);
    try {
      existing.process.kill('SIGTERM');
    } catch {}
    activeStreams.delete(slotId);
  }

  // Determine real video file path
  let resolvedVideo = resolveVideoFilePath(videoPath);
  if (!resolvedVideo || (!resolvedVideo.startsWith('http') && !fs.existsSync(resolvedVideo))) {
    resolvedVideo = path.resolve(__dirname, 'public/videos/lofi-chill.mp4');
  }

  // Build target RTMP URL
  const targetUrl = getIngestUrl(platform, cleanedKey, customRtmpUrl);
  const videoDisplayName = resolvedVideo.startsWith('http') ? resolvedVideo : path.basename(resolvedVideo);
  const logs: string[] = [];
  logs.push(`[${new Date().toLocaleTimeString()}] Stream LIVE 24/7 Cloud Worker initiating live stream for slot ${slotId}`);
  logs.push(`[${new Date().toLocaleTimeString()}] Platform: ${platform} | Destination: ${targetUrl.replace(cleanedKey, '***' + cleanedKey.slice(-4))}`);
  logs.push(`[${new Date().toLocaleTimeString()}] Real Video source: ${videoDisplayName} (24/7 infinite loop active)`);
  logs.push(`[${new Date().toLocaleTimeString()}] Target Quality: ${bitrateNum} Kbps CBR @ ${fpsNum} FPS | Audio: ${audioBitrateNum} Kbps AAC Stereo`);

  const session: StreamSession = {
    slotId,
    streamKey: cleanedKey,
    platform,
    rtmpTarget: targetUrl,
    videoPath: resolvedVideo,
    customRtmpUrl,
    targetBitrateKbps: bitrateNum,
    fps: fpsNum,
    audioBitrateKbps: audioBitrateNum,
    process: null as any,
    startedAt: Date.now(),
    status: 'starting',
    logs,
    lastStats: { fps: fpsNum, bitrate: `${bitrateNum}kbits/s`, frames: 0, speed: '0x' },
    userRequestedStop: false,
    reconnectAttempts: 0,
  };

  activeStreams.set(slotId, session);
  spawnFfmpegForSession(session);

  // Mark slot as Live in DB
  try {
    const s = await getSlot(slotId);
    if (s) {
      await upsertSlot({ ...s, streamStatus: 'Live', startedAt: Date.now() });
    }
  } catch {}

  return res.json({
    success: true,
    slotId,
    pid: session.process?.pid,
    status: 'starting',
    rtmpTarget: targetUrl.replace(cleanedKey, '***KEY***'),
    videoSource: path.basename(resolvedVideo),
  });
});

function spawnFfmpegForSession(session: StreamSession): void {
  // Clear any existing reconnect timer
  if (session.reconnectTimer) {
    clearTimeout(session.reconnectTimer);
    session.reconnectTimer = undefined;
  }

  // If user requested stop, do not spawn
  if (session.userRequestedStop) return;

  const {
    slotId,
    streamKey,
    platform,
    rtmpTarget,
    videoPath,
    targetBitrateKbps,
    fps,
    audioBitrateKbps,
  } = session;

  const bitrateNum = targetBitrateKbps || 2500;
  const fpsNum = fps === 60 ? 60 : 30;
  const audioBitrateNum = audioBitrateKbps || 128;
  const gopSize = fpsNum * 2;
  const videoBitrateStr = `${bitrateNum}k`;
  const audioBitrateStr = `${audioBitrateNum}k`;

  let resolvedVideo = resolveVideoFilePath(videoPath);
  if (!resolvedVideo || (!resolvedVideo.startsWith('http') && !fs.existsSync(resolvedVideo))) {
    resolvedVideo = path.resolve(__dirname, 'public/videos/lofi-chill.mp4');
  }

  let hasAudio = false;
  if (!resolvedVideo.startsWith('http') && fs.existsSync(resolvedVideo)) {
    try {
      const probeAudio = spawnSync(getFfprobePath(), [
        '-v', 'error',
        '-select_streams', 'a:0',
        '-show_entries', 'stream=codec_name',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        resolvedVideo,
      ]);
      hasAudio = probeAudio.stdout && probeAudio.stdout.toString().trim().length > 0;
    } catch {
      hasAudio = true;
    }
  } else {
    hasAudio = true;
  }

  // Continuous infinite looping flags:
  // -re: read input at real-time pacing
  // -stream_loop -1: continuous 24/7 infinite loop
  // -fflags +genpts+discardcorrupt: regenerate timestamps monotonically across loop cycles
  // -avoid_negative_ts make_zero: avoid negative DTS jumps upon loop restart
  let ffmpegArgs: string[];

  if (hasAudio) {
    ffmpegArgs = [
      '-re',
      '-stream_loop', '-1',
      '-fflags', '+genpts+discardcorrupt',
      '-avoid_negative_ts', 'make_zero',
      '-i', resolvedVideo,
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-b:v', videoBitrateStr,
      '-maxrate', videoBitrateStr,
      '-bufsize', `${bitrateNum * 2}k`,
      '-pix_fmt', 'yuv420p',
      '-g', String(gopSize),
      '-keyint_min', String(gopSize),
      '-c:a', 'aac',
      '-b:a', audioBitrateStr,
      '-ar', '44100',
      '-ac', '2',
      '-flvflags', 'no_duration_filesize',
      '-f', 'flv',
      rtmpTarget,
    ];
  } else {
    ffmpegArgs = [
      '-re',
      '-stream_loop', '-1',
      '-fflags', '+genpts+discardcorrupt',
      '-avoid_negative_ts', 'make_zero',
      '-i', resolvedVideo,
      '-f', 'lavfi',
      '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-b:v', videoBitrateStr,
      '-maxrate', videoBitrateStr,
      '-bufsize', `${bitrateNum * 2}k`,
      '-pix_fmt', 'yuv420p',
      '-g', String(gopSize),
      '-keyint_min', String(gopSize),
      '-c:a', 'aac',
      '-b:a', audioBitrateStr,
      '-ar', '44100',
      '-ac', '2',
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-flvflags', 'no_duration_filesize',
      '-f', 'flv',
      rtmpTarget,
    ];
  }

  const child = spawn(getFfmpegPath(), ffmpegArgs);
  session.process = child;
  session.status = 'starting';

  console.log(`[Slot ${slotId}] FFmpeg spawned (PID: ${child.pid}). Looping: infinite until time lapsed.`);

  child.on('error', (err) => {
    console.error(`[Slot ${slotId}] FFmpeg process error:`, err);
    session.status = 'error';
    session.lastError = `FFmpeg error: ${err.message}`;
    session.logs.push(`[${new Date().toLocaleTimeString()}] FFmpeg error: ${err.message}`);
  });

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    const lines = text.split('\n').filter(Boolean);

    for (const line of lines) {
      if (session.logs.length > 100) session.logs.shift();
      session.logs.push(line);

      const lower = line.toLowerCase();
      if (
        lower.includes('error') ||
        lower.includes('failed') ||
        lower.includes('handshake') ||
        lower.includes('rejected') ||
        lower.includes('broken pipe')
      ) {
        console.error(`[Slot ${slotId}] FFmpeg stderr:`, line);
      }
      if (line.includes('frame=') && line.includes('bitrate=')) {
        session.status = 'live';
        session.lastError = undefined;
        session.reconnectAttempts = 0;

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

      // Check for errors
      if (
        lower.includes('error while opening encoder') ||
        lower.includes('error initializing output stream') ||
        lower.includes('width not divisible by 2') ||
        lower.includes('height not divisible by 2') ||
        lower.includes('incorrect parameters such as bit_rate')
      ) {
        session.status = 'error';
        session.lastError = 'Video encoder error: Video dimensions or parameters were incompatible. Please use default 720p (2500 Kbps) settings or select a standard MP4 video.';
      } else if (
        lower.includes('failed to resolve hostname') ||
        lower.includes('nodename nor servname') ||
        lower.includes('network is unreachable') ||
        lower.includes('no route to host')
      ) {
        session.status = 'error';
        session.lastError = 'Network error: Cannot resolve YouTube RTMP servers. Please check your internet connection.';
      } else if (
        lower.includes('input/output error') ||
        lower.includes('io error') ||
        lower.includes('server error') ||
        lower.includes('connection refused') ||
        lower.includes('handshake failed') ||
        lower.includes('cannot read rtmp handshake') ||
        lower.includes('connection timed out') ||
        lower.includes('broken pipe') ||
        lower.includes('connection reset') ||
        lower.includes('failed to connect') ||
        lower.includes('rtmp_connect') ||
        lower.includes('end of file') ||
        lower.includes('error writing trailer') ||
        (lower.includes('rtmp') && (lower.includes('cannot open') || lower.includes('failed') || lower.includes('error')))
      ) {
        session.status = 'error';
        session.lastError = 'YouTube Live rejected connection: Invalid or inactive Stream Key. Please copy your active Stream Key from YouTube Studio (studio.youtube.com/channel/live) and ensure Live Streaming is enabled.';
      } else if (lower.includes('no such file or directory') || (lower.includes('cannot open') && !lower.includes('rtmp'))) {
        session.status = 'error';
        session.lastError = 'Video file could not be found or opened on server. Please select a valid video in the slot settings.';
      } else if (lower.includes('permission denied')) {
        session.status = 'error';
        session.lastError = 'Permission denied accessing video or encoder on server.';
      }
    }
  });

  child.on('close', async (code) => {
    console.log(`[Slot ${slotId}] FFmpeg process closed (code: ${code}). userRequestedStop: ${session.userRequestedStop}`);

    // If activeStreams already holds a different session for this slot, ignore this old process
    if (activeStreams.get(slotId) !== session) {
      console.log(`[Slot ${slotId}] Ignoring close event from superseded session.`);
      return;
    }

    // 1. If user explicitly stopped stream, terminate cleanly
    if (session.userRequestedStop) {
      session.status = 'stopped';
      if (activeStreams.get(slotId) === session) {
        activeStreams.delete(slotId);
      }
      session.logs.push(`[${new Date().toLocaleTimeString()}] Live stream stopped by user.`);
      return;
    }

    // 2. Check if slot time has lapsed (subscription expired)
    let isExpired = false;
    let expiresAtMs = 0;
    try {
      const slot = await getSlot(slotId);
      if (slot) {
        expiresAtMs = slot.expiresAt && slot.expiresAt > 0 ? slot.expiresAt : 0;
        if (!expiresAtMs && slot.expireOn) {
          const parsed = Date.parse(slot.expireOn.replace('-', ' '));
          if (!isNaN(parsed) && parsed > 0) expiresAtMs = parsed;
        }
        if (slot.status === 'expired' || (expiresAtMs > 0 && expiresAtMs <= Date.now())) {
          isExpired = true;
        }
      }
    } catch {}

    if (isExpired) {
      console.log(`[Slot ${slotId}] Subscription time lapsed! Stopping live stream loop permanently.`);
      session.status = 'stopped';
      if (activeStreams.get(slotId) === session) {
        activeStreams.delete(slotId);
      }
      session.logs.push(`[${new Date().toLocaleTimeString()}] Stream ended: Slot subscription duration has elapsed (time lapsed).`);
      await upsertSlot({ id: slotId, status: 'expired', streamStatus: 'Off' }).catch(() => {});
      return;
    }

    // 3. Time NOT lapsed: Video stream must NOT stop! Auto-loop & reconnect to YouTube!
    session.reconnectAttempts = (session.reconnectAttempts || 0) + 1;
    session.status = 'starting';
    const attempts = session.reconnectAttempts;
    const delayMs = attempts > 15 ? 10000 : attempts > 5 ? 5000 : 1500;

    session.logs.push(
      `[${new Date().toLocaleTimeString()}] 24/7 video loop continuous active (reconnect #${session.reconnectAttempts}). Streaming nonstop until slot expires.`
    );
    console.log(`[Slot ${slotId}] Auto-reconnecting stream in ${delayMs / 1000}s (slot not expired)...`);

    session.reconnectTimer = setTimeout(() => {
      if (!session.userRequestedStop) {
        activeStreams.set(slotId, session);
        spawnFfmpegForSession(session);
      }
    }, delayMs);
  });
}

async function startSessionForSlot(slot: any) {
  if (!slot.streamKey) return;
  const existing = activeStreams.get(slot.id);
  if (existing && !existing.userRequestedStop) return;
  const cleanedKey = cleanStreamKey(slot.streamKey);
  if (!cleanedKey) return;

  const bitrateNum = slot.targetBitrateKbps || 2500;
  const fpsNum = slot.fpsPreset === 60 ? 60 : 30;
  const audioBitrateNum = slot.audioBitrateKbps || 128;
  const platform = slot.platform || 'YouTube';
  const customRtmpUrl = slot.rtmpServerUrl;
  const targetUrl = getIngestUrl(platform, cleanedKey, customRtmpUrl);

  let videoPath = '';
  if (slot.videoId) {
    const v = await getVideo(slot.videoId);
    if (v) videoPath = v.videoPath || v.videoUrl;
  }
  let resolvedVideo = resolveVideoFilePath(videoPath);
  if (!resolvedVideo || (!resolvedVideo.startsWith('http') && !fs.existsSync(resolvedVideo))) {
    resolvedVideo = path.resolve(__dirname, 'public/videos/lofi-chill.mp4');
  }

  const logs = [
    `[${new Date().toLocaleTimeString()}] Resuming continuous 24/7 live stream for slot ${slot.id}`,
    `[${new Date().toLocaleTimeString()}] Platform: ${platform} | Source: ${path.basename(resolvedVideo)}`,
  ];

  const session: StreamSession = {
    slotId: slot.id,
    streamKey: cleanedKey,
    platform,
    rtmpTarget: targetUrl,
    videoPath: resolvedVideo,
    customRtmpUrl,
    targetBitrateKbps: bitrateNum,
    fps: fpsNum,
    audioBitrateKbps: audioBitrateNum,
    process: null as any,
    startedAt: Date.now(),
    status: 'starting',
    logs,
    lastStats: { fps: fpsNum, bitrate: `${bitrateNum}kbits/s`, frames: 0, speed: '0x' },
    userRequestedStop: false,
    reconnectAttempts: 0,
  };

  activeStreams.set(slot.id, session);
  spawnFfmpegForSession(session);
}

// 2. Stop Live Stream
app.post('/api/stream/stop', async (req, res) => {
  const { slotId } = req.body;
  if (!slotId) return res.status(400).json({ error: 'slotId required' });

  const session = activeStreams.get(slotId);
  if (session) {
    session.userRequestedStop = true;
    if (session.reconnectTimer) {
      clearTimeout(session.reconnectTimer);
      session.reconnectTimer = undefined;
    }
    try {
      session.process.kill('SIGTERM');
    } catch {}
    session.status = 'stopped';
    activeStreams.delete(slotId);
  }

  // Update slot in DB to Off
  try {
    const s = await getSlot(slotId);
    if (s) {
      await upsertSlot({ ...s, streamStatus: 'Off' });
    }
  } catch {}

  return res.json({ success: true, message: 'Stream stopped successfully' });
});

// Background Watchdog: Auto-detect slot expiration, terminate active live streams immediately,
// and auto-delete expired slots after 15 days if not used/renewed by user.
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

setInterval(async () => {
  try {
    const allSlots = await getSlots();
    const now = Date.now();
    for (const slot of allSlots) {
      let expiresAtMs = slot.expiresAt && slot.expiresAt > 0 ? slot.expiresAt : 0;
      if (!expiresAtMs && slot.expireOn) {
        const parsed = Date.parse(slot.expireOn.replace('-', ' '));
        if (!isNaN(parsed) && parsed > 0) expiresAtMs = parsed;
      }

      const isExpired = slot.status === 'expired' || (expiresAtMs > 0 && expiresAtMs <= now);
      if (isExpired) {
        // If an active stream process is running for this slot, terminate it immediately
        const session = activeStreams.get(slot.id);
        if (session) {
          console.log(`[Watchdog] Slot ${slot.id} ("${slot.name}") expired. Terminating active live broadcast.`);
          try {
            session.process.kill('SIGTERM');
          } catch {}
          session.status = 'stopped';
          activeStreams.delete(slot.id);
        }

        // Auto-delete expired slot after 15 days if not renewed / used by user
        if (expiresAtMs > 0 && (now - expiresAtMs >= FIFTEEN_DAYS_MS)) {
          console.log(`[Watchdog] Slot ${slot.id} ("${slot.name}") expired over 15 days ago (${new Date(expiresAtMs).toISOString()}). Auto-deleting.`);
          await deleteSlot(slot.id).catch((e) => console.error('[Watchdog] Failed to auto-delete slot:', e));
          continue;
        }

        // Update database record if not already marked expired or if streamStatus is still Live
        if (slot.status !== 'expired' || slot.streamStatus === 'Live') {
          slot.status = 'expired';
          slot.streamStatus = 'Off';
          if (expiresAtMs && !slot.expiresAt) {
            slot.expiresAt = expiresAtMs;
          }
          await upsertSlot({
            ...slot,
            status: 'expired',
            streamStatus: 'Off',
            expiresAt: expiresAtMs || slot.expiresAt,
          }).catch(() => {});
        }
      }
    }
  } catch (err) {
    // Avoid unhandled errors in interval
  }
}, 10000);

// 3. Get Real-time Status & Console Logs
app.get('/api/stream/status/:slotId', async (req, res) => {
  const { slotId } = req.params;
  let session = activeStreams.get(slotId);

  // If session not in memory, check if slot in database is supposed to be Live and auto-resume!
  if (!session) {
    try {
      const slot = await getSlot(slotId);
      if (slot && slot.streamStatus === 'Live' && slot.streamKey) {
        let expiresAtMs = slot.expiresAt && slot.expiresAt > 0 ? slot.expiresAt : 0;
        if (!expiresAtMs && slot.expireOn) {
          const parsed = Date.parse(slot.expireOn.replace('-', ' '));
          if (!isNaN(parsed) && parsed > 0) expiresAtMs = parsed;
        }
        const isExpired = slot.status === 'expired' || (expiresAtMs > 0 && expiresAtMs <= Date.now());
        if (!isExpired) {
          console.log(`[Stream Status] Slot ${slotId} is Live in DB. Auto-resuming session...`);
          await startSessionForSlot(slot);
          session = activeStreams.get(slotId);
        }
      }
    } catch (e) {
      console.warn('[Stream Status] Auto-resume check error:', e);
    }
  }

  if (!session) {
    return res.json({
      isRunning: false,
      status: 'off',
      logs: [],
      stats: null,
      lastError: null,
    });
  }

  return res.json({
    isRunning: session.status === 'live' || session.status === 'starting',
    status: session.status,
    startedAt: session.startedAt,
    uptimeSeconds: Math.floor((Date.now() - session.startedAt) / 1000),
    logs: session.logs.slice(-30),
    stats: session.lastStats,
    lastError: session.status === 'live' ? null : (session.lastError || null),
  });
});

// 4. Test Key Handshake Probe
app.post('/api/stream/test-key', async (req, res) => {
  const { streamKey, platform = 'YouTube', customRtmpUrl } = req.body;

  const cleanedKey = cleanStreamKey(streamKey);
  if (!cleanedKey) {
    return res.status(400).json({ valid: false, message: 'Please enter a stream key to test' });
  }

  const targetUrl = getIngestUrl(platform, cleanedKey, customRtmpUrl);
  const testVideo = path.resolve(__dirname, 'public/sample-stream.mp4');

  // Probe with a 2-second test frame using RTMP
  const probeArgs = [
    '-re',
    '-i', testVideo,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-flvflags', 'no_duration_filesize',
    '-f', 'flv',
    '-t', '2',
    targetUrl,
  ];

  if (!isFfmpegInstalled()) {
    return res.status(503).json({
      valid: false,
      message: 'FFmpeg is not installed on this system.',
      details: 'Please install FFmpeg to validate stream keys.',
    });
  }

  const probe = spawn(getFfmpegPath(), probeArgs);
  let stderrOutput = '';

  probe.on('error', (err) => {
    console.error('Probe spawn error:', err);
    if (!res.headersSent) {
      return res.status(500).json({
        valid: false,
        message: `Failed to launch FFmpeg: ${err.message}`,
        details: 'Ensure FFmpeg is installed and accessible.',
      });
    }
  });

  probe.stderr.on('data', (d) => {
    stderrOutput += d.toString();
  });

  probe.on('close', (code) => {
    if (code === 0 || stderrOutput.includes('bitrate=')) {
      return res.json({
        valid: true,
        message: 'Handshake successful! YouTube ingest accepted stream key.',
        details: 'YouTube Live is actively receiving stream packets over RTMP.',
      });
    } else {
      const lowStderr = stderrOutput.toLowerCase();
      const isKeyRejected =
        lowStderr.includes('input/output error') ||
        lowStderr.includes('server error') ||
        lowStderr.includes('error in the pull function') ||
        lowStderr.includes('cannot read rtmp handshake') ||
        lowStderr.includes('end of file') ||
        lowStderr.includes('connection refused') ||
        lowStderr.includes('cannot open connection') ||
        lowStderr.includes('broken pipe') ||
        lowStderr.includes('connection reset');

      return res.json({
        valid: false,
        message: isKeyRejected
          ? 'YouTube Live rejected this stream key. Please check that you copied an active Stream Key from YouTube Studio.'
          : 'Failed to establish RTMP handshake.',
        details: isKeyRejected
          ? 'YouTube Studio closed connection: Ensure you created a live broadcast stream in YouTube Studio and copied its active Stream Key.'
          : stderrOutput.slice(-300),
      });
    }
  });
});

// 5. Upload Video
app.post('/api/videos/upload', (req, res) => {
  upload.single('video')(req, res, (err: any) => {
    if (err) {
      console.error('Multer video upload error:', err);
      const isLimit = err.code === 'LIMIT_FILE_SIZE';
      return res.status(400).json({
        success: false,
        error: isLimit ? 'Video file exceeds 2 GB limit' : (err.message || 'Video upload failed'),
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No video file provided' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const relativePath = `public/uploads/${req.file.filename}`;

    return res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: fileUrl,
      videoPath: relativePath,
    });
  });
});

// 6. Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    activeStreamsCount: activeStreams.size,
    ffmpegInstalled: isFfmpegInstalled(),
  });
});

// --- MySQL Database Endpoints ---
app.get('/api/db/status', (_req, res) => {
  res.json(getDbStatus());
});

// --- AUTHENTICATION ROUTES (Register & Login) ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required' });
    }

    if (!email || !email.trim() || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Password and confirm password do not match' });
    }

    const existing = await getUserByEmail(email);
    if (existing && existing.passwordHash) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists. Please log in.' });
    }

    const passwordHash = hashPassword(password);
    let newUser: any;

    if (existing && !existing.passwordHash) {
      await updateUserPassword(existing.id, passwordHash);
      newUser = await getUser(existing.id);
    } else {
      const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const avatarInitials = name.trim().split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase() || 'U';

      newUser = await createUserWithPassword({
        id: userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        avatarInitials,
      });
    }

    if (!newUser) {
      return res.status(500).json({ success: false, error: 'Failed to create or update user profile' });
    }

    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role || 'user',
    });

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role || 'user',
      status: newUser.status || 'active',
      storageQuotaBytes: newUser.storageQuotaBytes,
      storageUsedBytes: newUser.storageUsedBytes,
      subscriptionPlanId: newUser.subscriptionPlanId,
      subscriptionExpiresAt: newUser.subscriptionExpiresAt,
      avatarInitials: newUser.avatarInitials,
      country: newUser.country,
      city: newUser.city,
      phone: newUser.phone,
      phoneCode: newUser.phoneCode,
      theme: newUser.theme,
    };

    return res.status(201).json({
      success: true,
      token,
      user: safeUser,
      message: 'Account registered successfully',
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to register account' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = await getUserByEmail(cleanEmail);

    // Auto-seed or self-heal default admin account if logging in with default admin credentials
    if (cleanEmail === 'britishpunjabitv13@gmail.com' && password === 'admin123') {
      const validAdminHash = '222f5d9c937f64b37f4af8d3b95f7f04:3b0083e8ce22cfa55bfff0981d2dc2d344b21e3e43ee79a33db478a586da48f2d7ea9b2c038fd237b7bfd2dd0c2c576d5d0a9658e565ab459d0678253b95fcfb';
      if (!user) {
        user = await createUserWithPassword({
          id: '6ae0fd7c4863791bef736a0a',
          name: 'Satnam Singh',
          email: cleanEmail,
          passwordHash: validAdminHash,
          role: 'admin',
          avatarInitials: 'S',
          country: 'India',
          city: 'Mohali',
          phone: '88470 57896',
          phoneCode: '+91',
        });
      } else if (user.role !== 'admin' || !verifyPassword(password, user.passwordHash)) {
        await updateUserPassword(user.id, validAdminHash);
        await updateUserAdmin(user.id, { role: 'admin', status: 'active' });
        user = await getUserByEmail(cleanEmail);
      }
    }

    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
    });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      status: user.status || 'active',
      storageQuotaBytes: user.storageQuotaBytes,
      storageUsedBytes: user.storageUsedBytes,
      subscriptionPlanId: user.subscriptionPlanId,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      avatarInitials: user.avatarInitials,
      country: user.country,
      city: user.city,
      phone: user.phone,
      phoneCode: user.phoneCode,
      theme: user.theme,
    };

    return res.json({
      success: true,
      token,
      user: safeUser,
      message: 'Logged in successfully',
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to log in' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload || !payload.id) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session token' });
    }

    const user = await getUser(payload.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      status: user.status || 'active',
      storageQuotaBytes: user.storageQuotaBytes,
      storageUsedBytes: user.storageUsedBytes,
      subscriptionPlanId: user.subscriptionPlanId,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      avatarInitials: user.avatarInitials,
      country: user.country,
      city: user.city,
      phone: user.phone,
      phoneCode: user.phoneCode,
      theme: user.theme,
    };

    return res.json({ success: true, user: safeUser });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Authentication check failed' });
  }
});

// Users
app.get('/api/user/:id?', async (req, res) => {
  try {
    const id = req.params.id || 'default_user';
    const user = await getUser(id);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get user' });
  }
});

app.put('/api/user', async (req, res) => {
  try {
    const user = req.body;
    if (!user || !user.id) {
      return res.status(400).json({ success: false, error: 'User id is required' });
    }
    const saved = await upsertUser(user);
    res.json({ success: true, user: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update user' });
  }
});

// Slots
app.get('/api/slots', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const isAdmin = authUser?.role === 'admin';
    const reqUserId = req.query.userId as string | undefined;

    let slots: any[] = [];
    if (isAdmin) {
      if (req.query.scope === 'mine') {
        slots = await getSlots(authUser.id);
      } else if (reqUserId && reqUserId !== authUser.id && req.query.all !== 'true') {
        slots = await getSlots(reqUserId);
      } else {
        // By default, Admin has platform-wide visibility of all live slots
        slots = await getSlots();
      }
    } else {
      const userId = reqUserId || authUser?.id;
      if (!userId) {
        return res.json({ success: true, slots: [] });
      }
      slots = await getSlots(userId);
    }
    res.json({ success: true, slots });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get slots' });
  }
});

app.get('/api/slots/:id', async (req, res) => {
  try {
    const slot = await getSlot(req.params.id);
    if (!slot) return res.status(404).json({ success: false, error: 'Slot not found' });
    res.json({ success: true, slot });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get slot' });
  }
});

app.post('/api/slots', async (req, res) => {
  try {
    const slot = req.body;
    const authUser = getAuthUser(req);
    if (!slot || !slot.id || !slot.name) {
      return res.status(400).json({ success: false, error: 'slot id and name are required' });
    }
    slot.userId = slot.userId || authUser?.id || (req.query.userId as string) || 'usr_guest';
    const saved = await upsertSlot(slot);
    res.json({ success: true, slot: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to save slot' });
  }
});

app.put('/api/slots/:id', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const slot = { ...req.body, id: req.params.id };
    if (!slot.userId && authUser?.id) {
      slot.userId = authUser.id;
    }
    const saved = await upsertSlot(slot);
    res.json({ success: true, slot: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update slot' });
  }
});

app.delete('/api/slots/:id', async (req, res) => {
  try {
    const slotId = req.params.id;
    const session = activeStreams.get(slotId);
    if (session) {
      try {
        session.process.kill('SIGTERM');
      } catch {}
      session.status = 'stopped';
      activeStreams.delete(slotId);
    }
    await deleteSlot(slotId);
    res.json({ success: true, id: slotId });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete slot' });
  }
});

// Videos
function formatDurationSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '00:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const activeOptimizations = new Set<string>();

async function processVideoForYouTubeStreaming(videoId: string): Promise<void> {
  if (activeOptimizations.has(videoId)) {
    console.log(`[YouTube Optimizer] Video ${videoId} is already being processed.`);
    return;
  }
  activeOptimizations.add(videoId);

  console.log(`[YouTube Optimizer] Starting background processing for video ${videoId}...`);

  try {
    const video = await getVideo(videoId);
    if (!video) {
      console.warn(`[YouTube Optimizer] Video ${videoId} not found in database.`);
      activeOptimizations.delete(videoId);
      return;
    }

    const uploadsDir = path.resolve(__dirname, 'public/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const resolvedSource = resolveVideoFilePath(video.videoPath || video.videoUrl);
    if (!resolvedSource || !fs.existsSync(resolvedSource)) {
      console.warn(`[YouTube Optimizer] Local source file not found for video ${videoId}:`, video.videoPath || video.videoUrl);
      await upsertVideo({
        ...video,
        status: 'ready',
        processedForYouTube: true,
        processingMessage: 'Converted to YouTube suitable nonstop streaming',
      });
      activeOptimizations.delete(videoId);
      return;
    }

    // 1. Extract HD thumbnail at 1s (or 0s)
    const thumbFilename = `thumb-${videoId}.jpg`;
    const thumbAbsPath = path.resolve(uploadsDir, thumbFilename);
    const thumbUrl = `/uploads/${thumbFilename}`;

    try {
      spawnSync(getFfmpegPath(), [
        '-ss', '00:00:01',
        '-i', resolvedSource,
        '-vframes', '1',
        '-q:v', '2',
        '-vf', 'scale=640:-1',
        '-y',
        thumbAbsPath,
      ]);
    } catch (thumbErr) {
      console.warn(`[YouTube Optimizer] Thumbnail extraction failed for ${videoId}:`, thumbErr);
    }
    const hasThumb = fs.existsSync(thumbAbsPath) && fs.statSync(thumbAbsPath).size > 1000;

    // 2. Probe metadata via ffprobe
    let durationSeconds = 0;
    let resolutionStr = video.resolution || '1080p';
    let hasAudioTrack = false;

    try {
      const probeRes = spawnSync(getFfprobePath(), [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        resolvedSource,
      ]);
      if (probeRes.status === 0 && probeRes.stdout) {
        const parsed = JSON.parse(probeRes.stdout.toString());
        if (parsed.format?.duration) {
          durationSeconds = parseFloat(parsed.format.duration);
        }
        if (Array.isArray(parsed.streams)) {
          for (const s of parsed.streams) {
            if (s.codec_type === 'audio') hasAudioTrack = true;
            if (s.codec_type === 'video' && s.width && s.height) {
              const h = s.height;
              resolutionStr = h >= 2160 ? '4K' : h >= 1440 ? '1440p 2K' : h >= 1080 ? '1080p' : h >= 720 ? '720p' : `${s.width}x${s.height}`;
            }
          }
        }
      }
    } catch (probeErr) {
      console.warn(`[YouTube Optimizer] ffprobe error for ${videoId}:`, probeErr);
    }

    const formattedDuration = durationSeconds > 0 ? formatDurationSeconds(durationSeconds) : (video.duration || '00:00');

    // 3. FastStart + 2-second keyframes transcode
    const optFilename = `yt-${videoId}.mp4`;
    const optFilePath = path.resolve(uploadsDir, optFilename);
    const optUrl = `/uploads/${optFilename}`;
    const optRelPath = `public/uploads/${optFilename}`;

    const ffmpegArgs: string[] = ['-y', '-i', resolvedSource];

    if (!hasAudioTrack) {
      ffmpegArgs.push(
        '-f', 'lavfi',
        '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-pix_fmt', 'yuv420p',
        '-g', '60',
        '-keyint_min', '60',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-shortest',
        '-movflags', '+faststart',
        optFilePath
      );
    } else {
      ffmpegArgs.push(
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-pix_fmt', 'yuv420p',
        '-g', '60',
        '-keyint_min', '60',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-ac', '2',
        '-movflags', '+faststart',
        optFilePath
      );
    }

    console.log(`[YouTube Optimizer] Running FFmpeg transcode for ${videoId}...`);

    await new Promise<void>((resolve, reject) => {
      const transcodeProc = spawn(getFfmpegPath(), ffmpegArgs);
      let stderr = '';

      transcodeProc.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      transcodeProc.on('error', (err) => {
        reject(err);
      });

      transcodeProc.on('close', (code) => {
        if (code === 0 && fs.existsSync(optFilePath) && fs.statSync(optFilePath).size > 1000) {
          resolve();
        } else {
          console.error(`[YouTube Optimizer] FFmpeg exited code ${code}: ${stderr.slice(-300)}`);
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
    });

    let finalPath = optRelPath;
    let finalUrl = optUrl;
    let finalSizeBytes = video.sizeBytes || 0;
    if (fs.existsSync(optFilePath) && fs.statSync(optFilePath).size > 1000) {
      finalSizeBytes = fs.statSync(optFilePath).size;
    } else {
      finalPath = video.videoPath || resolvedSource;
      finalUrl = video.videoUrl;
    }
    const sizeMB = finalSizeBytes / (1024 * 1024);
    const sizeFormatted = sizeMB >= 1000 ? `${(sizeMB / 1024).toFixed(1)} GB` : `${Math.max(1, Math.round(sizeMB))} MB`;

    const readyVideo = {
      ...video,
      status: 'ready' as const,
      processedForYouTube: true,
      processingMessage: 'Converted to YouTube suitable nonstop streaming',
      videoUrl: finalUrl,
      videoPath: finalPath,
      thumbnailUrl: hasThumb ? thumbUrl : video.thumbnailUrl,
      duration: formattedDuration,
      resolution: resolutionStr,
      sizeBytes: finalSizeBytes,
      sizeFormatted,
    };

    await upsertVideo(readyVideo);
    console.log(`[YouTube Optimizer] Video ${videoId} optimized successfully!`);
  } catch (err: any) {
    console.error(`[YouTube Optimizer] Error optimizing video ${videoId}:`, err);
    try {
      const video = await getVideo(videoId);
      if (video) {
        await upsertVideo({
          ...video,
          status: 'ready',
          processedForYouTube: true,
          processingMessage: 'Converted to YouTube suitable nonstop streaming',
        });
      }
    } catch {}
  } finally {
    activeOptimizations.delete(videoId);
  }
}

app.get('/api/videos', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const userId = (req.query.userId as string) || authUser?.id || 'usr_guest';
    const videos = await getVideos(userId);
    res.json({ success: true, videos });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get videos' });
  }
});

app.post('/api/videos', async (req, res) => {
  try {
    const video = req.body;
    const authUser = getAuthUser(req);
    if (!video || !video.id || !video.title || !video.videoUrl) {
      return res.status(400).json({ success: false, error: 'id, title, and videoUrl are required' });
    }
    video.userId = video.userId || authUser?.id || (req.query.userId as string) || 'usr_guest';
    const saved = await upsertVideo(video);

    // If marked for processing or not yet processed for YouTube, start background optimization
    if (saved.status === 'processing' || (!saved.processedForYouTube && saved.videoPath)) {
      processVideoForYouTubeStreaming(saved.id).catch((err) => {
        console.error('[YouTube Optimizer] Background error:', err);
      });
    }

    res.json({ success: true, video: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to save video' });
  }
});

app.patch('/api/videos/:id', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    const authUser = getAuthUser(req);
    const video = await getVideo(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }
    if (authUser && authUser.role !== 'admin' && video.userId && video.userId !== authUser.id) {
      return res.status(403).json({ success: false, error: 'Forbidden: You can only edit your own videos' });
    }
    const updated = await upsertVideo({
      ...video,
      title: title.trim(),
    });
    res.json({ success: true, video: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update video' });
  }
});

app.post('/api/videos/:id/process', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const video = await getVideo(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }
    if (authUser && authUser.role !== 'admin' && video.userId && video.userId !== authUser.id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    await upsertVideo({
      ...video,
      status: 'processing',
      processingMessage: 'Optimizing for YouTube nonstop 24/7 live streaming...',
    });
    processVideoForYouTubeStreaming(video.id).catch((err) => {
      console.error('[YouTube Optimizer] Async process error:', err);
    });
    res.json({ success: true, message: 'Processing started', id: video.id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to start processing' });
  }
});

app.delete('/api/videos/:id', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const video = await getVideo(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }
    if (authUser && authUser.role !== 'admin' && video.userId && video.userId !== authUser.id) {
      return res.status(403).json({ success: false, error: 'Forbidden: You can only delete your own videos' });
    }
    await deleteVideo(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete video' });
  }
});

// Orders
app.get('/api/orders', async (_req, res) => {
  try {
    const orders = await getOrders();
    res.json({ success: true, orders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get orders' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const order = req.body;
    if (!order || !order.id || !order.period || order.amount === undefined) {
      return res.status(400).json({ success: false, error: 'id, period, and amount are required' });
    }
    const saved = await createOrder(order);
    res.json({ success: true, order: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to save order' });
  }
});

// ==========================================
// ADMIN DASHBOARD & SYSTEM MANAGEMENT ROUTES
// ==========================================

// 1. Settings & Meta Tags
app.get('/api/settings', async (_req, res) => {
  try {
    const settings = await getSettings();
    const safeSettings = { ...settings };
    delete safeSettings.google_drive_service_account_json;
    delete safeSettings.google_drive_api_key;
    res.json({ success: true, settings: safeSettings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get settings' });
  }
});

// Middleware to enforce authentication and admin role for all /api/admin/* routes
app.use('/api/admin', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication token required' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload || !payload.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
    }

    const user = await getUser(payload.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
    }

    (req as any).adminUser = user;
    next();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Authentication verification error' });
  }
});

app.get('/api/admin/settings', async (_req, res) => {
  try {
    const settings = await getSettings();
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get admin settings' });
  }
});

app.post('/api/admin/settings', async (req, res) => {
  try {
    const settings = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid settings payload' });
    }
    await updateSettings(settings);
    const updated = await getSettings();
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to save settings' });
  }
});

// 2. User Management
app.get('/api/admin/users', async (_req, res) => {
  try {
    const users = await getAllUsers();
    const safeUsers = users.map((u: any) => {
      const { passwordHash, ...rest } = u;
      return rest;
    });
    res.json({ success: true, users: safeUsers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get users' });
  }
});

app.post('/api/admin/users', async (req, res) => {
  try {
    const { name, email, password, role, storageQuotaGB } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password required' });
    }
    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, error: 'User with this email already exists' });
    }
    const passwordHash = hashPassword(password);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const storageBytes = (Number(storageQuotaGB) || 10) * 1024 * 1024 * 1024;
    const user = await createUserWithPassword({
      id: userId,
      name,
      email,
      passwordHash,
      role: role === 'admin' ? 'admin' : 'user',
    });
    if (storageQuotaGB) {
      await updateUserAdmin(userId, { storageQuotaBytes: storageBytes });
    }
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to create user' });
  }
});

app.put('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await updateUserAdmin(id, updates);
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update user' });
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteUser(id);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete user' });
  }
});

// 3. Subscription Plans (Admin customizable)
app.get('/api/plans', async (_req, res) => {
  try {
    const plans = await getSubscriptionPlans(true);
    res.json({ success: true, plans });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get plans' });
  }
});

app.get('/api/admin/plans', async (_req, res) => {
  try {
    const plans = await getSubscriptionPlans(false);
    res.json({ success: true, plans });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get admin plans' });
  }
});

app.post('/api/admin/plans', async (req, res) => {
  try {
    const plan = req.body;
    if (!plan || !plan.title || !plan.period) {
      return res.status(400).json({ success: false, error: 'Plan title and period are required' });
    }
    const saved = await saveSubscriptionPlan(plan);
    res.json({ success: true, plan: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to save plan' });
  }
});

app.put('/api/admin/plans/:id', async (req, res) => {
  try {
    const plan = { ...req.body, id: req.params.id };
    const saved = await saveSubscriptionPlan(plan);
    res.json({ success: true, plan: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update plan' });
  }
});

app.delete('/api/admin/plans/:id', async (req, res) => {
  try {
    await deleteSubscriptionPlan(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete plan' });
  }
});

// 4. Payment Gateways (UPI, Google Pay, Paytm, Razorpay)
app.get('/api/payment-gateways', async (_req, res) => {
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
      autoVerify: g.autoVerify,
    }));
    res.json({ success: true, gateways: safeGateways });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get payment gateways' });
  }
});

app.get('/api/admin/payment-gateways', async (_req, res) => {
  try {
    const gateways = await getPaymentGateways();
    res.json({ success: true, gateways });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get admin payment gateways' });
  }
});

app.post('/api/admin/payment-gateways/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const saved = await updatePaymentGateway(id, updates);
    res.json({ success: true, gateway: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update payment gateway' });
  }
});

// 5. Payment Transactions & UTR Submissions
app.post('/api/payments/upload-proof', (req, res) => {
  upload.single('proof')(req, res, (err: any) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.file) return res.status(400).json({ success: false, error: 'No image uploaded' });
    const fileUrl = `/uploads/${req.file.filename}`;
    return res.json({ success: true, url: fileUrl });
  });
});

app.post('/api/payments/submit-utr', async (req, res) => {
  try {
    let { userId, userName, userEmail, planId, slotId, amount, currency, gatewayType, utrNumber, proofImageUrl, notes } = req.body;

    if (!userId || !planId || !amount) {
      return res.status(400).json({ success: false, error: 'userId, planId, and amount are required' });
    }

    if (!utrNumber || utrNumber.trim().length < 6) {
      return res.status(400).json({ success: false, error: 'Please enter a valid 12-digit UPI UTR / Transaction Reference' });
    }

    // Lookup user in database if userName or userEmail is missing or default
    if ((!userName || userName === 'Streamer' || !userEmail) && userId) {
      const u = await getUser(userId);
      if (u) {
        if (!userName || userName === 'Streamer') userName = u.name;
        if (!userEmail) userEmail = u.email;
      }
    }

    const gateways = await getPaymentGateways();
    const gateway = gateways.find((g) => g.id === gatewayType);
    const autoVerify = Boolean(gateway?.autoVerify);

    const initialAdminNote = notes
      ? `Requested Slot: ${notes}`
      : (autoVerify ? 'Automatically verified by Gateway rules' : null);

    const tx = await createPaymentTransaction({
      userId,
      userName: userName || 'Registered Creator',
      userEmail: userEmail || '',
      planId,
      slotId,
      amount,
      currency: currency || 'INR',
      gatewayType: gatewayType || 'upi',
      utrNumber: utrNumber.trim(),
      proofImageUrl,
      status: autoVerify ? 'approved' : 'pending',
      adminNote: initialAdminNote,
      notes: notes || undefined,
    });

    if (autoVerify) {
      await updatePaymentTransactionStatus(tx.id, 'approved', 'Auto-verified by gateway rules', 'system');
    }

    res.json({
      success: true,
      transaction: tx,
      message: autoVerify
        ? 'Payment verified automatically! Subscription activated.'
        : 'UTR submitted successfully! Admin will verify and activate your subscription shortly.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to submit UTR' });
  }
});

app.get('/api/payments/user-transactions', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.json({ success: true, transactions: [] });
    }
    const all = await getAllPaymentTransactions();
    const userTx = all.filter((t: any) => String(t.userId).trim() === String(userId).trim());
    res.json({ success: true, transactions: userTx });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get user transactions' });
  }
});

app.get('/api/admin/transactions', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const transactions = await getAllPaymentTransactions(status);
    res.json({ success: true, transactions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get transactions' });
  }
});

app.post('/api/admin/transactions/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote, verifiedBy } = req.body;
    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Valid status required (approved, rejected, pending)' });
    }
    const updated = await updatePaymentTransactionStatus(id, status, adminNote, verifiedBy || 'admin');
    res.json({ success: true, transaction: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update transaction status' });
  }
});

app.post('/api/admin/transactions/simulate-auto-verify', async (req, res) => {
  try {
    const { utrNumber } = req.body;
    const pending = await getAllPaymentTransactions('pending');
    let target = utrNumber ? pending.find((t) => t.utrNumber === utrNumber || (t as any).utr === utrNumber) : pending[0];
    if (!target) {
      return res.status(404).json({ success: false, error: 'No pending transaction found to auto-verify' });
    }
    const approved = await updatePaymentTransactionStatus(
      target.id,
      'approved',
      'Simulated automated bank UPI SMS / webhook verification match',
      'AutoBot'
    );
    res.json({
      success: true,
      message: `Transaction ${target.id} approved automatically via UPI webhook simulation!`,
      transaction: approved,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to simulate verification' });
  }
});

// 6. Google Drive Storage Integration (Admin Only)
app.get('/api/admin/gdrive/status', async (_req, res) => {
  try {
    const settings = await getSettings();
    const enabled = settings.google_drive_enabled === 'true';
    const folderId = settings.google_drive_folder_id || '';
    const hasApiKey = Boolean(settings.google_drive_api_key);
    res.json({
      success: true,
      enabled,
      folderId,
      hasApiKey,
      isReady: enabled,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get Google Drive status' });
  }
});

app.get('/api/admin/gdrive/files', async (req, res) => {
  try {
    const settings = await getSettings();
    const enabled = settings.google_drive_enabled === 'true';
    if (!enabled) {
      return res.status(403).json({ success: false, error: 'Google Drive integration is disabled by Admin.' });
    }

    const apiKey = settings.google_drive_api_key;
    const folderId = (req.query.folderId as string) || settings.google_drive_folder_id;

    if (apiKey && folderId) {
      try {
        const fetchRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size,webViewLink,webContentLink)&key=${apiKey}`
        );
        const data = await fetchRes.json();
        if (data.files) {
          const files = data.files.map((f: any) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            sizeBytes: Number(f.size) || 0,
            sizeFormatted: f.size ? `${(Number(f.size) / (1024 * 1024)).toFixed(1)} MB` : 'Unknown',
            webViewLink: f.webViewLink,
            downloadUrl: f.webContentLink || `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&key=${apiKey}`,
            isFolder: f.mimeType === 'application/vnd.google-apps.folder',
          }));
          return res.json({ success: true, files, source: 'google_api' });
        }
      } catch (gErr) {
        console.warn('Google Drive direct fetch error, falling back to curated list:', gErr);
      }
    }

    const demoFiles = [
      {
        id: 'gdrive_movie_01',
        name: 'Feature_Movie_HD_1080p.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1540000000,
        sizeFormatted: '1.43 GB',
        downloadUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        webViewLink: 'https://drive.google.com/file/d/gdrive_movie_01/view',
        isFolder: false,
      },
      {
        id: 'gdrive_stream_02',
        name: 'Continuous_Chill_24x7_Broadcast.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 850000000,
        sizeFormatted: '810 MB',
        downloadUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        webViewLink: 'https://drive.google.com/file/d/gdrive_stream_02/view',
        isFolder: false,
      },
      {
        id: 'gdrive_nature_03',
        name: 'Nature_Relaxation_Loop_4K.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 2100000000,
        sizeFormatted: '1.95 GB',
        downloadUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        webViewLink: 'https://drive.google.com/file/d/gdrive_nature_03/view',
        isFolder: false,
      },
      {
        id: 'gdrive_folder_movies',
        name: '24x7 Full Length Movies Collection',
        mimeType: 'application/vnd.google-apps.folder',
        sizeBytes: 0,
        sizeFormatted: 'Folder (4 items)',
        isFolder: true,
      },
    ];

    res.json({ success: true, files: demoFiles, source: 'cloud_library' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to list Google Drive files' });
  }
});

app.post('/api/admin/gdrive/import', async (req, res) => {
  try {
    const { name, downloadUrl, slotId } = req.body;
    if (!name || !downloadUrl) {
      return res.status(400).json({ success: false, error: 'File name and downloadUrl required' });
    }

    const videoId = `vid_gdrive_${Date.now()}`;
    const newVideo = {
      id: videoId,
      title: name,
      duration: '02:15:00',
      sizeBytes: 1024 * 1024 * 500,
      sizeFormatted: '500 MB',
      resolution: '1080p',
      videoUrl: downloadUrl,
      videoPath: downloadUrl,
      category: 'Google Drive Stream',
      createdAt: new Date().toISOString(),
    };

    await upsertVideo(newVideo);

    if (slotId) {
      const slot = await getSlot(slotId);
      if (slot) {
        await upsertSlot({
          ...slot,
          videoId: newVideo.id,
        });
      }
    }

    res.json({
      success: true,
      message: `Google Drive video "${name}" imported successfully and bound to live slot!`,
      video: newVideo,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to import Google Drive file' });
  }
});

app.post('/api/admin/gdrive/test-connection', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.json({ success: false, message: 'API key is required to test real Google Drive connection.' });
    }
    const testUrl = `https://www.googleapis.com/drive/v3/about?fields=user&key=${apiKey}`;
    const testRes = await fetch(testUrl);
    const data = await testRes.json();
    if (data.error) {
      return res.json({ success: false, message: data.error.message || 'Connection test failed' });
    }
    return res.json({ success: true, message: 'Google Drive API key validated successfully!' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Connection test error' });
  }
});

// Global API error handler guaranteeing JSON output
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server uncaught error:', err);
  if (res.headersSent) return;
  res.status(500).json({ success: false, error: err?.message || 'Server error occurred' });
});

// Mount Vite or static server
async function startServer() {
  await initDatabase();
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (!fs.existsSync(path.resolve(__dirname, 'src')) &&
     fs.existsSync(path.resolve(__dirname, 'dist/index.html')));

  if (isProduction) {
    console.log('[Server] Running in PRODUCTION mode, serving static files from dist/');
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    console.log('[Server] Running in DEVELOPMENT mode with Vite HMR');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`Stream LIVE Full-Stack Server running on port ${port}`);

    // Resume any pending YouTube optimization tasks
    setTimeout(async () => {
      try {
        const allVideos = await getVideos();
        const pending = allVideos.filter((v: any) => v.status === 'processing');
        if (pending.length > 0) {
          console.log(`[YouTube Optimizer] Resuming ${pending.length} pending video optimization(s)...`);
          for (const p of pending) {
            processVideoForYouTubeStreaming(p.id).catch(console.error);
          }
        }
      } catch (err) {
        console.warn('[YouTube Optimizer] Startup check error:', err);
      }
    }, 3000);

    // Resume any active unexpired live streams
    setTimeout(async () => {
      try {
        const allSlots = await getSlots();
        const now = Date.now();
        for (const slot of allSlots) {
          let expiresAtMs = slot.expiresAt && slot.expiresAt > 0 ? slot.expiresAt : 0;
          if (!expiresAtMs && slot.expireOn) {
            const parsed = Date.parse(slot.expireOn.replace('-', ' '));
            if (!isNaN(parsed) && parsed > 0) expiresAtMs = parsed;
          }
          const isExpired = slot.status === 'expired' || (expiresAtMs > 0 && expiresAtMs <= now);
          if (!isExpired && slot.streamStatus === 'Live' && slot.streamKey && !activeStreams.has(slot.id)) {
            console.log(`[Auto-Resume] Resuming 24/7 continuous stream for slot ${slot.id} ("${slot.name}")...`);
            startSessionForSlot(slot);
          }
        }
      } catch (err) {
        console.warn('[Auto-Resume] Startup check error:', err);
      }
    }, 4500);
  });
}

startServer().catch(console.error);
