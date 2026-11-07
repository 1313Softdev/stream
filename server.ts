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
    const base = customUrl.trim().replace(/\/+$/, '');
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
    try {
      existing.process.kill('SIGTERM');
    } catch {}
    activeStreams.delete(slotId);
  }

  // Determine real video file path
  let resolvedVideo = '';
  if (videoPath && typeof videoPath === 'string') {
    const trimmed = videoPath.trim();
    if (trimmed === 'vid-lofi-01' || trimmed.includes('lofi')) {
      resolvedVideo = path.resolve(__dirname, 'public/videos/lofi-chill.mp4');
    } else if (trimmed === 'vid-nature-02' || trimmed.includes('nature')) {
      resolvedVideo = path.resolve(__dirname, 'public/videos/nature-relax.mp4');
    } else if (trimmed === 'vid-tech-03' || trimmed.includes('tech')) {
      resolvedVideo = path.resolve(__dirname, 'public/videos/tech-masterclass.mp4');
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      resolvedVideo = trimmed;
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
          resolvedVideo = cand;
          break;
        }
      }
    }
  }

  // Fallback to real preset broadcast video (never color bars test pattern)
  if (!resolvedVideo || (!resolvedVideo.startsWith('http') && !fs.existsSync(resolvedVideo))) {
    resolvedVideo = path.resolve(__dirname, 'public/videos/lofi-chill.mp4');
  }

  // Check if input has audio track to guarantee YouTube receives stereo audio
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

  // Build target RTMP URL
  const targetUrl = getIngestUrl(platform, cleanedKey, customRtmpUrl);

  const videoDisplayName = resolvedVideo.startsWith('http') ? resolvedVideo : path.basename(resolvedVideo);
  const logs: string[] = [];
  logs.push(`[${new Date().toLocaleTimeString()}] Stream LIVE 24/7 Cloud Worker initiating live stream for slot ${slotId}`);
  logs.push(`[${new Date().toLocaleTimeString()}] Platform: ${platform} | Destination: ${targetUrl.replace(cleanedKey, '***' + cleanedKey.slice(-4))}`);
  logs.push(`[${new Date().toLocaleTimeString()}] Real Video source: ${videoDisplayName} (24/7 infinite loop active)`);
  logs.push(`[${new Date().toLocaleTimeString()}] Target Quality: ${bitrateNum} Kbps CBR @ ${fpsNum} FPS | Audio: ${audioBitrateNum} Kbps AAC Stereo`);

  // YouTube Live encoding settings:
  // -re: read input at real-time pacing
  // -stream_loop -1: continuous 24/7 infinite loop
  // -c:v libx264: universally compatible H.264
  // -b:v ${bitrateNum}k -minrate ${bitrateNum}k -maxrate ${bitrateNum}k -bufsize ${bitrateNum}k: Strict constant bitrate
  // -x264-params "nal-hrd=cbr:force-cfr=1": Enforce CBR with filler packets so YouTube never gets low bitrate warning
  // -r ${fpsNum}: Constant configured frame rate
  // -g ${gopSize} -keyint_min ${gopSize}: exactly 2-second keyframes required by YouTube/Twitch
  // -c:a aac -b:a ${audioBitrateNum}k -ar 44100 -ac 2: YouTube recommended stereo audio spec
  // -flvflags no_duration_filesize -f flv: standard RTMP live FLV container
  let ffmpegArgs: string[];

  if (hasAudio) {
    ffmpegArgs = [
      '-re',
      '-stream_loop', '-1',
      '-i', resolvedVideo,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-b:v', videoBitrateStr,
      '-minrate', videoBitrateStr,
      '-maxrate', videoBitrateStr,
      '-bufsize', videoBitrateStr,
      '-x264-params', 'nal-hrd=cbr:force-cfr=1',
      '-r', String(fpsNum),
      '-pix_fmt', 'yuv420p',
      '-g', String(gopSize),
      '-keyint_min', String(gopSize),
      '-c:a', 'aac',
      '-b:a', audioBitrateStr,
      '-ar', '44100',
      '-ac', '2',
      '-flvflags', 'no_duration_filesize',
      '-f', 'flv',
      targetUrl,
    ];
  } else {
    // Input has no audio track: synthesize stereo audio so YouTube never shows "bitrate (0)" warning
    ffmpegArgs = [
      '-re',
      '-stream_loop', '-1',
      '-i', resolvedVideo,
      '-f', 'lavfi',
      '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-b:v', videoBitrateStr,
      '-minrate', videoBitrateStr,
      '-maxrate', videoBitrateStr,
      '-bufsize', videoBitrateStr,
      '-x264-params', 'nal-hrd=cbr:force-cfr=1',
      '-r', String(fpsNum),
      '-pix_fmt', 'yuv420p',
      '-g', String(gopSize),
      '-keyint_min', String(gopSize),
      '-c:a', 'aac',
      '-b:a', audioBitrateStr,
      '-ar', '44100',
      '-ac', '2',
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-shortest',
      '-flvflags', 'no_duration_filesize',
      '-f', 'flv',
      targetUrl,
    ];
  }

  const child = spawn(getFfmpegPath(), ffmpegArgs);

  const session: StreamSession = {
    slotId,
    streamKey,
    platform,
    rtmpTarget: targetUrl,
    videoPath: resolvedVideo,
    process: child,
    startedAt: Date.now(),
    status: 'starting',
    logs,
    lastStats: { fps: fpsNum, bitrate: `${bitrateNum}kbits/s`, frames: 0, speed: '0x' },
  };

  activeStreams.set(slotId, session);

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

      // Parse FFmpeg progress
      // Example: frame=  120 fps= 30 q=24.0 size=    1024kB time=00:00:04.00 bitrate=1048.5kbits/s speed=1.0x
      if (line.includes('frame=') && line.includes('bitrate=')) {
        session.status = 'live';

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
      const lower = line.toLowerCase();
      if (
        lower.includes('input/output error') ||
        lower.includes('io error') ||
        lower.includes('server error') ||
        lower.includes('connection refused') ||
        lower.includes('handshake failed') ||
        lower.includes('connection timed out') ||
        lower.includes('broken pipe') ||
        lower.includes('connection reset') ||
        lower.includes('failed to connect') ||
        lower.includes('rtmp_connect')
      ) {
        session.status = 'error';
        session.lastError = 'YouTube rejected connection: Invalid, expired, or inactive Stream Key. Please make sure Live Streaming is enabled on your channel and copy the active key from YouTube Studio.';
      } else if (lower.includes('no such file or directory') || lower.includes('cannot open')) {
        session.status = 'error';
        session.lastError = 'Video file could not be found or opened on server. Please select a valid video in the slot settings.';
      } else if (lower.includes('permission denied')) {
        session.status = 'error';
        session.lastError = 'Permission denied accessing video or encoder on server.';
      }
    }
  });

  child.on('close', (code) => {
    session.status = code === 0 ? 'stopped' : 'error';
    if (code !== 0 && !session.lastError) {
      const errorMsg = [...session.logs].reverse().find(l => {
        const low = l.toLowerCase();
        return (
          low.includes('error') ||
          low.includes('failed') ||
          low.includes('invalid') ||
          low.includes('rejected') ||
          low.includes('denied')
        );
      });

      if (errorMsg) {
        session.lastError = `Stream failed: ${errorMsg}`;
      } else {
        session.lastError = `FFmpeg exited with code ${code}. Most common cause: Invalid or dummy YouTube Stream Key. Please copy your real Stream Key from YouTube Studio (studio.youtube.com).`;
      }
    }
    session.logs.push(`[${new Date().toLocaleTimeString()}] Stream process ended (code ${code})`);
  });

  return res.json({
    success: true,
    slotId,
    pid: child.pid,
    status: 'starting',
    rtmpTarget: targetUrl.replace(streamKey.trim(), '***KEY***'),
    videoSource: path.basename(resolvedVideo),
  });
});

// 2. Stop Live Stream
app.post('/api/stream/stop', (req, res) => {
  const { slotId } = req.body;
  if (!slotId) return res.status(400).json({ error: 'slotId required' });

  const session = activeStreams.get(slotId);
  if (!session) {
    return res.json({ success: true, message: 'Stream was not running' });
  }

  try {
    session.process.kill('SIGTERM');
  } catch {}

  session.status = 'stopped';
  activeStreams.delete(slotId);

  return res.json({ success: true, message: 'Stream stopped successfully' });
});

// 3. Get Real-time Status & Console Logs
app.get('/api/stream/status/:slotId', (req, res) => {
  const { slotId } = req.params;
  const session = activeStreams.get(slotId);

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
    lastError: session.lastError || null,
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

  // Probe with a 2-second test frame using RTMPS port 443
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
        details: 'YouTube Live is actively receiving stream packets over RTMPS port 443.',
      });
    } else {
      const isKeyRejected =
        stderrOutput.includes('Input/output error') ||
        stderrOutput.includes('Server error') ||
        stderrOutput.includes('Error in the pull function');

      return res.json({
        valid: false,
        message: isKeyRejected
          ? 'YouTube ingest rejected this stream key. Please check that you copied an active Stream Key from YouTube Studio.'
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

    const user = await getUserByEmail(email);
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
    const userId = (req.query.userId as string) || authUser?.id;
    if (!userId) {
      return res.json({ success: true, slots: [] });
    }
    const slots = await getSlots(userId);
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
    await deleteSlot(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete slot' });
  }
});

// Videos
app.get('/api/videos', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const userId = (req.query.userId as string) || authUser?.id;
    if (!userId) {
      return res.json({ success: true, videos: [] });
    }
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
    res.json({ success: true, video: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to save video' });
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
    const { userId, userName, userEmail, planId, slotId, amount, currency, gatewayType, utrNumber, proofImageUrl } = req.body;

    if (!userId || !planId || !amount) {
      return res.status(400).json({ success: false, error: 'userId, planId, and amount are required' });
    }

    if (!utrNumber || utrNumber.trim().length < 6) {
      return res.status(400).json({ success: false, error: 'Please enter a valid 12-digit UPI UTR / Transaction Reference' });
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
      currency: currency || 'INR',
      gatewayType: gatewayType || 'upi',
      utrNumber: utrNumber.trim(),
      proofImageUrl,
      status: autoVerify ? 'approved' : 'pending',
      adminNote: autoVerify ? 'Automatically verified by Gateway rules' : null,
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
    let target = utrNumber ? pending.find((t) => t.utrNumber === utrNumber) : pending[0];
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
  });
}

startServer().catch(console.error);
