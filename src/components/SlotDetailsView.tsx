import React, { useState, useEffect } from 'react';
import {
  Calendar,
  X,
  Plus,
  Play,
  Square,
  Copy,
  Check,
  Eye,
  EyeOff,
  ChevronDown,
  Film,
  AlertCircle,
  Radio,
  ExternalLink,
  Users,
  Activity,
  Clock,
  Timer,
  CheckCircle2,
  CalendarClock,
  Zap,
  RefreshCw,
  Server,
  Sparkles,
  Terminal,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Gauge,
  Sliders,
} from 'lucide-react';
import { Slot, VideoItem, StreamingPlatform } from '../types';
import { AppView } from './Sidebar';
import { testStreamKeyHandshake, fetchStreamStatus, StreamTelemetry } from '../lib/streamingService';

interface SlotDetailsViewProps {
  slot: Slot;
  videos: VideoItem[];
  onUpdateSlot: (updated: Slot) => void;
  onNavigate: (view: AppView) => void;
  onToggleStream: (slotId: string, overrides?: Partial<Slot>) => void;
  onScheduleStream?: (slotId: string, startTime: string) => void;
  onCancelSchedule?: (slotId: string) => void;
}

export const SlotDetailsView: React.FC<SlotDetailsViewProps> = ({
  slot,
  videos,
  onUpdateSlot,
  onNavigate,
  onToggleStream,
  onScheduleStream,
  onCancelSchedule,
}) => {
  const [slotName, setSlotName] = useState(slot.name);
  const [streamKey, setStreamKey] = useState(slot.streamKey);
  const [platform, setPlatform] = useState<StreamingPlatform>(slot.platform);
  const [streamLoop, setStreamLoop] = useState(slot.streamLoop);
  const [streamEndTime, setStreamEndTime] = useState(slot.streamEndTime);
  const [selectedVideoId, setSelectedVideoId] = useState<string | undefined>(slot.videoId);
  const [autoStartOnKeyUpdate, setAutoStartOnKeyUpdate] = useState<boolean>(
    slot.autoStartOnKeyUpdate ?? true
  );

  // Stream Quality & Bitrate Settings
  const [targetBitrateKbps, setTargetBitrateKbps] = useState<number>(
    slot.targetBitrateKbps ?? 2500
  );
  const [fpsPreset, setFpsPreset] = useState<30 | 60>(
    slot.fpsPreset ?? 30
  );
  const [audioBitrateKbps, setAudioBitrateKbps] = useState<number>(
    slot.audioBitrateKbps ?? 128
  );
  const [qualityPreset, setQualityPreset] = useState<string>(
    slot.qualityPresetName ?? (slot.targetBitrateKbps === 5000 ? '1080p-5000' : slot.targetBitrateKbps === 4500 ? '1080p-4500' : slot.targetBitrateKbps === 8000 ? '2k-8000' : slot.targetBitrateKbps && slot.targetBitrateKbps !== 2500 ? 'custom' : '720p-2500')
  );

  // Stream Key Actions state
  const [isKeySaving, setIsKeySaving] = useState(false);
  const [keyJustUpdated, setKeyJustUpdated] = useState(false);
  const [copiedRtmp, setCopiedRtmp] = useState(false);
  const [customRtmpUrl, setCustomRtmpUrl] = useState(
    slot.rtmpServerUrl || 'rtmp://a.rtmp.youtube.com/live2'
  );

  // Schedule Stream Start Options
  const [scheduleStartEnabled, setScheduleStartEnabled] = useState<boolean>(
    slot.scheduleStartEnabled ?? (slot.streamStatus === 'Scheduled')
  );
  const [streamStartTime, setStreamStartTime] = useState<string>(
    slot.streamStartTime || 'October 30th, 2026 06:00 PM'
  );

  const [showStreamKey, setShowStreamKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // Live RTMP Ingest Handshake Probe & Server Telemetry
  const [isProbingKey, setIsProbingKey] = useState(false);
  const [probeResult, setProbeResult] = useState<{ valid: boolean; message: string; details?: string } | null>(null);
  const [telemetry, setTelemetry] = useState<StreamTelemetry | null>(null);
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);

  // Synchronize state when slot prop updates from Realtime Firestore
  useEffect(() => {
    setSlotName(slot.name);
    setStreamKey(slot.streamKey);
    setPlatform(slot.platform);
    setStreamLoop(slot.streamLoop);
    setStreamEndTime(slot.streamEndTime);
    setSelectedVideoId(slot.videoId);
    setAutoStartOnKeyUpdate(slot.autoStartOnKeyUpdate ?? true);
    setScheduleStartEnabled(slot.scheduleStartEnabled ?? (slot.streamStatus === 'Scheduled'));
    if (slot.streamStartTime) setStreamStartTime(slot.streamStartTime);
    if (slot.rtmpServerUrl) setCustomRtmpUrl(slot.rtmpServerUrl);
    if (slot.targetBitrateKbps) setTargetBitrateKbps(slot.targetBitrateKbps);
    if (slot.fpsPreset) setFpsPreset(slot.fpsPreset);
    if (slot.audioBitrateKbps) setAudioBitrateKbps(slot.audioBitrateKbps);
    if (slot.qualityPresetName) setQualityPreset(slot.qualityPresetName);
  }, [slot.id, slot.name, slot.streamKey, slot.platform, slot.streamLoop, slot.videoId, slot.streamStatus, slot.autoStartOnKeyUpdate, slot.streamStartTime, slot.rtmpServerUrl, slot.targetBitrateKbps, slot.fpsPreset, slot.audioBitrateKbps, slot.qualityPresetName]);

  // Live countdown timer for "Expires in : HH:MM:SS"
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 30, seconds: 38 });

  // Simulated countdown for scheduled start
  const [scheduledCountdown, setScheduledCountdown] = useState({ hours: 3, minutes: 29, seconds: 22 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });

      setScheduledCountdown((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll cloud telemetry when live
  useEffect(() => {
    if (slot.streamStatus !== 'Live') {
      setTelemetry(null);
      return;
    }
    const poll = async () => {
      try {
        const data = await fetchStreamStatus(slot.id);
        setTelemetry(data);
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 2500);
    return () => clearInterval(interval);
  }, [slot.id, slot.streamStatus]);

  const handleProbeKey = async () => {
    if (!streamKey.trim()) {
      setNotificationToast('Please paste a stream key before running the handshake probe.');
      setTimeout(() => setNotificationToast(null), 3500);
      return;
    }
    setIsProbingKey(true);
    setProbeResult(null);
    try {
      const res = await testStreamKeyHandshake(streamKey, platform, customRtmpUrl);
      setProbeResult(res);
      if (res.valid) {
        setNotificationToast('✅ YouTube Live RTMP connection verified!');
      } else {
        setNotificationToast('⚠️ Ingest probe: Stream key rejected by YouTube.');
      }
      setTimeout(() => setNotificationToast(null), 4000);
    } catch (err: any) {
      setProbeResult({
        valid: false,
        message: 'Could not contact RTMP ingest server',
        details: err.message,
      });
    } finally {
      setIsProbingKey(false);
    }
  };

  // Sync state back
  const handleSave = (updates?: Partial<Slot>) => {
    onUpdateSlot({
      ...slot,
      name: slotName,
      streamKey,
      platform,
      streamLoop,
      scheduleStartEnabled,
      streamStartTime,
      streamEndTime,
      videoId: selectedVideoId,
      ...updates,
    });
  };

  const getRtmpUrlForPlatform = (p: StreamingPlatform) => {
    switch (p) {
      case 'YouTube':
        // YouTube RTMPS on port 443 is universally open across cloud environments
        return 'rtmps://a.rtmp.youtube.com:443/live2';
      case 'Facebook':
        return 'rtmps://live-api-s.facebook.com:443/rtmp/';
      case 'Twitch':
        return 'rtmp://live.twitch.tv/app/';
      case 'Custom RTMP':
        return customRtmpUrl || 'rtmps://a.rtmp.youtube.com:443/live2';
    }
  };

  const getPlatformDashboardUrl = (p: StreamingPlatform) => {
    switch (p) {
      case 'YouTube':
        return 'https://studio.youtube.com/channel/live';
      case 'Facebook':
        return 'https://www.facebook.com/live/producer';
      case 'Twitch':
        return 'https://dashboard.twitch.tv/stream-manager';
      case 'Custom RTMP':
        return '';
    }
  };

  // Quality Preset & Bitrate Change Handlers
  const handleQualityPresetSelect = (preset: { id: string; name: string; bitrate: number; fps: number; audio: number }) => {
    setTargetBitrateKbps(preset.bitrate);
    setFpsPreset(preset.fps as 30 | 60);
    setAudioBitrateKbps(preset.audio);
    setQualityPreset(preset.id);

    const updated: Slot = {
      ...slot,
      name: slotName,
      streamKey,
      platform,
      streamLoop,
      scheduleStartEnabled,
      streamStartTime,
      streamEndTime,
      videoId: selectedVideoId,
      autoStartOnKeyUpdate,
      targetBitrateKbps: preset.bitrate,
      fpsPreset: preset.fps as 30 | 60,
      audioBitrateKbps: preset.audio,
      qualityPresetName: preset.id,
    };
    onUpdateSlot(updated);
    setNotificationToast(`Quality preset applied: ${preset.name} (${preset.bitrate} Kbps @ ${preset.fps} FPS)`);
    setTimeout(() => setNotificationToast(null), 3000);
  };

  const handleCustomBitrateChange = (val: number) => {
    const clamped = Math.max(1000, Math.min(15000, val));
    setTargetBitrateKbps(clamped);
    setQualityPreset('custom');

    const updated: Slot = {
      ...slot,
      name: slotName,
      streamKey,
      platform,
      streamLoop,
      scheduleStartEnabled,
      streamStartTime,
      streamEndTime,
      videoId: selectedVideoId,
      autoStartOnKeyUpdate,
      targetBitrateKbps: clamped,
      fpsPreset,
      audioBitrateKbps,
      qualityPresetName: 'custom',
    };
    onUpdateSlot(updated);
  };

  const handleFpsChange = (fps: 30 | 60) => {
    setFpsPreset(fps);
    const updated: Slot = {
      ...slot,
      name: slotName,
      streamKey,
      platform,
      streamLoop,
      scheduleStartEnabled,
      streamStartTime,
      streamEndTime,
      videoId: selectedVideoId,
      autoStartOnKeyUpdate,
      targetBitrateKbps,
      fpsPreset: fps,
      audioBitrateKbps,
      qualityPresetName: qualityPreset,
    };
    onUpdateSlot(updated);
  };

  const handleAudioBitrateChange = (audio: number) => {
    setAudioBitrateKbps(audio);
    const updated: Slot = {
      ...slot,
      name: slotName,
      streamKey,
      platform,
      streamLoop,
      scheduleStartEnabled,
      streamStartTime,
      streamEndTime,
      videoId: selectedVideoId,
      autoStartOnKeyUpdate,
      targetBitrateKbps,
      fpsPreset,
      audioBitrateKbps: audio,
      qualityPresetName: qualityPreset,
    };
    onUpdateSlot(updated);
  };

  // 1. Save stream key without forcibly interrupting/starting unless requested
  const handleSaveKeyOnly = (keyToSave?: string) => {
    const raw = keyToSave !== undefined ? keyToSave : streamKey;
    const trimmed = raw.trim();
    setStreamKey(trimmed);
    setIsKeySaving(true);

    const updatedSlot: Slot = {
      ...slot,
      name: slotName,
      streamKey: trimmed,
      platform,
      streamLoop,
      scheduleStartEnabled,
      streamStartTime,
      streamEndTime,
      videoId: selectedVideoId,
      autoStartOnKeyUpdate,
      targetBitrateKbps,
      fpsPreset,
      audioBitrateKbps,
      qualityPresetName: qualityPreset,
    };

    onUpdateSlot(updatedSlot);

    setTimeout(() => {
      setIsKeySaving(false);
      setKeyJustUpdated(true);
      setTimeout(() => setKeyJustUpdated(false), 3000);
      setNotificationToast(`Stream key saved: ${trimmed ? '...' + trimmed.slice(-4) : '(empty)'}`);
      setTimeout(() => setNotificationToast(null), 3500);
    }, 200);
  };

  // 2. Direct Action: Go live with the specified key immediately
  const handleGoLiveWithKey = (keyToUse?: string) => {
    const raw = keyToUse !== undefined ? keyToUse : streamKey;
    const trimmed = raw.trim();
    if (!trimmed) {
      setNotificationToast('Please paste your YouTube Stream Key before broadcasting.');
      setTimeout(() => setNotificationToast(null), 3500);
      return;
    }

    setStreamKey(trimmed);
    setIsKeySaving(true);

    let assignedVideoId = selectedVideoId;
    if (!assignedVideoId && videos.length > 0) {
      assignedVideoId = videos[0].id;
      setSelectedVideoId(assignedVideoId);
    }

    const updatedSlot: Slot = {
      ...slot,
      name: slotName,
      streamKey: trimmed,
      platform,
      streamLoop,
      scheduleStartEnabled,
      streamStartTime,
      streamEndTime,
      videoId: assignedVideoId,
      autoStartOnKeyUpdate,
      targetBitrateKbps,
      fpsPreset,
      audioBitrateKbps,
      qualityPresetName: qualityPreset,
      streamStatus: 'Live',
      startedAt: Date.now(),
    };

    onUpdateSlot(updatedSlot);

    // Call onToggleStream with immediate overrides so cloud worker starts with the exact key, bitrate, and fps
    onToggleStream(slot.id, {
      streamKey: trimmed,
      platform,
      videoId: assignedVideoId,
      streamStatus: 'Live',
      targetBitrateKbps,
      fpsPreset,
      audioBitrateKbps,
    });

    setTimeout(() => {
      setIsKeySaving(false);
      setKeyJustUpdated(true);
      setTimeout(() => setKeyJustUpdated(false), 4000);
      setNotificationToast(`🔴 24/7 Cloud Encoder broadcasting to ${platform} Live Ingest at ${targetBitrateKbps} Kbps!`);
      setTimeout(() => setNotificationToast(null), 4000);
    }, 200);
  };

  const handlePasteKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const cleaned = text.trim();
        setStreamKey(cleaned);
        handleSaveKeyOnly(cleaned);
      }
    } catch {
      setNotificationToast('Please paste the stream key into the input field.');
      setTimeout(() => setNotificationToast(null), 3000);
    }
  };

  const handleCopyRtmp = () => {
    const url = getRtmpUrlForPlatform(platform);
    navigator.clipboard.writeText(url);
    setCopiedRtmp(true);
    setTimeout(() => setCopiedRtmp(false), 2000);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(streamKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSelectVideo = (video: VideoItem) => {
    setSelectedVideoId(video.id);
    onUpdateSlot({
      ...slot,
      name: slotName,
      streamKey,
      platform,
      streamLoop,
      scheduleStartEnabled,
      streamStartTime,
      streamEndTime,
      videoId: video.id,
    });
    setShowVideoModal(false);
  };

  const handleRemoveVideo = () => {
    setSelectedVideoId(undefined);
    onUpdateSlot({
      ...slot,
      name: slotName,
      streamKey,
      platform,
      streamLoop,
      scheduleStartEnabled,
      streamStartTime,
      streamEndTime,
      videoId: undefined,
    });
  };

  // Quick preset helper for schedule start
  const applySchedulePreset = (minutesFromNow: number, label: string) => {
    const target = new Date(Date.now() + minutesFromNow * 60 * 1000);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[target.getMonth()];
    const day = target.getDate();
    const daySuffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    const year = target.getFullYear();
    let hours = target.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const mins = String(target.getMinutes()).padStart(2, '0');
    const formatted = `${month} ${day}${daySuffix}, ${year} ${String(hours).padStart(2, '0')}:${mins} ${ampm}`;

    setStreamStartTime(formatted);
    setScheduleStartEnabled(true);
    onUpdateSlot({
      ...slot,
      scheduleStartEnabled: true,
      streamStartTime: formatted,
    });
  };

  const handleScheduleSubmit = () => {
    if (!currentVideo) {
      setNotificationToast('Please select a video for this slot first.');
      setTimeout(() => setNotificationToast(null), 3500);
      setShowVideoModal(true);
      return;
    }
    if (!streamStartTime.trim()) {
      setNotificationToast('Please specify a valid start date and time.');
      setTimeout(() => setNotificationToast(null), 3500);
      return;
    }

    if (onScheduleStream) {
      onScheduleStream(slot.id, streamStartTime);
    } else {
      onUpdateSlot({
        ...slot,
        scheduleStartEnabled: true,
        streamStartTime,
        streamStatus: 'Scheduled',
      });
    }
  };

  const handleCancelSchedule = () => {
    if (onCancelSchedule) {
      onCancelSchedule(slot.id);
    } else {
      onUpdateSlot({
        ...slot,
        scheduleStartEnabled: false,
        streamStatus: 'Off',
      });
      setScheduleStartEnabled(false);
    }
  };

  const currentVideo = videos.find((v) => v.id === selectedVideoId);
  const isStreaming = slot.streamStatus === 'Live';
  const isScheduled = slot.streamStatus === 'Scheduled';

  // Format countdown strings
  const formattedCountdown = `${String(timeLeft.hours).padStart(2, '0')}:${String(
    timeLeft.minutes
  ).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`;

  const formattedScheduledCountdown = `${String(scheduledCountdown.hours).padStart(2, '0')}:${String(
    scheduledCountdown.minutes
  ).padStart(2, '0')}:${String(scheduledCountdown.seconds).padStart(2, '0')}`;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
      {/* Toast Alert */}
      {notificationToast && (
        <div className="fixed top-20 right-6 z-50 bg-amber-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{notificationToast}</span>
        </div>
      )}

      {/* Title & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Slot Details
          </h2>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 ml-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              App
            </button>
            <span>&gt;</span>
            <button
              onClick={() => onNavigate('live-slots')}
              className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              Live Slots
            </button>
            <span>&gt;</span>
            <span className="text-[#6320ee] dark:text-[#a855f7]">Slot</span>
          </div>
        </div>
      </div>

      {/* Slot Id Heading matching Screenshot 1 */}
      <div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
          Slot Id: {slot.id}
        </h3>
      </div>

      {/* Stream Status and Expiration bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Stream Status:
          </span>
          {isStreaming ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Now
            </span>
          ) : isScheduled ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#6320ee] dark:text-[#a855f7]">
              <CalendarClock className="w-4 h-4 animate-pulse" />
              Scheduled ({streamStartTime})
            </span>
          ) : (
            <span className="text-sm font-bold text-red-500">
              Off
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm font-semibold text-red-500 tabular-nums">
            Expires in : {formattedCountdown}
          </div>
          <button
            onClick={() => onNavigate('billing')}
            className="px-4 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800/80 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors cursor-pointer"
          >
            Renew now
          </button>
        </div>
      </div>

      {/* Scheduled Stream Active Notice Banner */}
      {isScheduled && (
        <div className="p-4 sm:p-5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-[#6320ee]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#6320ee] text-white flex items-center justify-center shrink-0 shadow-xs">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Stream Scheduled to Start Automatically
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Target launch: <span className="font-semibold text-[#6320ee] dark:text-[#a855f7]">{streamStartTime}</span> · Starts in approx <span className="font-mono font-semibold tabular-nums">{formattedScheduledCountdown}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCancelSchedule}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-red-600 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel Schedule
            </button>
            <button
              onClick={() => onToggleStream(slot.id, { targetBitrateKbps, fpsPreset, audioBitrateKbps })}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#6320ee] hover:bg-[#5218cc] rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Start Immediately
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Form Inputs (Left) and Video Box (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Form Controls */}
        <div className="flex flex-col gap-6">
          {/* Slot Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Slot Name
            </label>
            <input
              type="text"
              value={slotName}
              onChange={(e) => {
                setSlotName(e.target.value);
                onUpdateSlot({ ...slot, name: e.target.value });
              }}
              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
              placeholder="e.g. Slot 1793129948103"
            />
          </div>

          {/* Stream Key & RTMP Cloud Broadcast Engine */}
          <div className="p-5 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#6320ee] dark:text-[#a855f7]" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Stream Key & Broadcast Destination
                </h4>
              </div>

              {/* Realtime Live Status Badge */}
              {isStreaming ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-600 text-white shadow-xs animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  REAL LIVE STREAM ACTIVE
                </span>
              ) : keyJustUpdated ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-xs">
                  <Check className="w-3.5 h-3.5" />
                  KEY SYNCED & READY
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Server className="w-3 h-3 text-[#6320ee]" />
                  24/7 Cloud Node Standby
                </span>
              )}
            </div>

            {/* Platform Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Streaming Platform
              </label>
              <div className="relative">
                <select
                  value={platform}
                  onChange={(e) => {
                    const p = e.target.value as StreamingPlatform;
                    setPlatform(p);
                    onUpdateSlot({ ...slot, platform: p });
                  }}
                  className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm font-medium py-2.5 px-3.5 pr-10 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#6320ee] cursor-pointer"
                >
                  <option value="YouTube">YouTube Live</option>
                  <option value="Facebook">Facebook Live</option>
                  <option value="Twitch">Twitch</option>
                  <option value="Custom RTMP">Custom RTMP Server</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Real RTMP Ingest URL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  RTMP Ingest Server URL
                </label>
                <button
                  type="button"
                  onClick={handleCopyRtmp}
                  className="text-[11px] font-semibold text-[#6320ee] dark:text-[#a855f7] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedRtmp ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>Copied Server URL</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Ingest URL</span>
                    </>
                  )}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={getRtmpUrlForPlatform(platform)}
                className="w-full px-3.5 py-2 text-xs font-mono bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 select-all"
              />
            </div>

            {/* Stream Key input & controls */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Stream Key*
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePasteKey}
                    className="text-[11px] font-semibold text-[#6320ee] dark:text-[#a855f7] hover:underline cursor-pointer"
                    title="Paste from clipboard"
                  >
                    Paste from Clipboard
                  </button>
                </div>
              </div>

              {/* Demo Key Notice if current key is the mock placeholder */}
              {(streamKey.trim() === 'hdef-dcea-vtkm-m7hw-50s0' || streamKey.trim().startsWith('live-')) && (
                <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Demo Key active. Replace with your YouTube Stream Key to broadcast online.</span>
                  </div>
                  <a
                    href="https://studio.youtube.com/channel/live"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-bold text-[#6320ee] dark:text-[#a855f7] hover:underline flex items-center gap-1 shrink-0"
                  >
                    <span>Get Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="relative flex items-center">
                <input
                  type={showStreamKey ? 'text' : 'password'}
                  value={streamKey}
                  onChange={(e) => setStreamKey(e.target.value)}
                  onBlur={() => handleSaveKeyOnly(streamKey)}
                  className="w-full px-3.5 py-2.5 pr-20 text-sm font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
                  placeholder="Paste your YouTube / RTMP stream key (e.g. xxxx-xxxx-xxxx-xxxx-xxxx)"
                  required
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowStreamKey(!showStreamKey)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                    title={showStreamKey ? "Hide key" : "Show key"}
                  >
                    {showStreamKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="p-1.5 text-slate-400 hover:text-[#6320ee] rounded cursor-pointer"
                    title="Copy stream key"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Stream Key Realtime Feedback */}
              <div className="flex items-center justify-between mt-1.5 text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">
                  {streamKey.trim().length > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Stream key entered ({streamKey.trim().length} chars)
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      Enter your YouTube stream key to broadcast 24/7 online
                    </span>
                  )}
                </span>

                {getPlatformDashboardUrl(platform) && (
                  <a
                    href={getPlatformDashboardUrl(platform)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-semibold text-[#6320ee] dark:text-[#a855f7] hover:underline flex items-center gap-1"
                  >
                    <span>Open {platform} Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Action Buttons for Stream Key */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleSaveKeyOnly(streamKey)}
                disabled={isKeySaving}
                className="flex-1 px-4 py-2.5 text-xs font-semibold rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isKeySaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#6320ee]" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Save Key</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleGoLiveWithKey(streamKey)}
                className="flex-1 px-4 py-2.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden group"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Stream Real on YouTube Now</span>
              </button>
            </div>

            {/* Test Handshake Probe Button */}
            <button
              type="button"
              onClick={handleProbeKey}
              disabled={isProbingKey}
              className="w-full px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isProbingKey ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#6320ee]" />
                  <span>Probing YouTube Ingest (Port 443 RTMPS)...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#6320ee]" />
                  <span>Test Ingest Handshake with YouTube (Port 443)</span>
                </>
              )}
            </button>

            {/* Handshake Result Banner */}
            {probeResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex flex-col gap-1.5 ${
                  probeResult.valid
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {probeResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span>{probeResult.message}</span>
                </div>
                {probeResult.details && (
                  <p className="text-[11px] opacity-90 font-mono break-all pl-6">
                    {probeResult.details}
                  </p>
                )}
              </div>
            )}

            {/* YouTube Live Online Helper & Troubleshooting */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Why is YouTube not running online yet?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTroubleshooter(!showTroubleshooter)}
                  className="text-[11px] font-semibold text-[#6320ee] dark:text-[#a855f7] hover:underline cursor-pointer"
                >
                  {showTroubleshooter ? 'Hide Checklist' : 'Show 3-Step Fix'}
                </button>
              </div>

              {showTroubleshooter && (
                <div className="mt-2 space-y-2 text-[11px] text-slate-700 dark:text-slate-300 pt-2 border-t border-amber-500/20">
                  <div className="p-2 rounded bg-white/70 dark:bg-slate-900/70 border border-amber-200/40 dark:border-amber-900/40">
                    <strong className="text-slate-900 dark:text-white font-semibold">1. YouTube "Auto-start" vs "Go Live" Button:</strong>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                      In YouTube Studio, if <strong>"Enable Auto-start"</strong> is OFF, YouTube receives the video feed but will NOT show online publicly until you click the blue <strong>"Go Live"</strong> button in the top-right corner of YouTube Studio!
                    </p>
                  </div>
                  <div className="p-2 rounded bg-white/70 dark:bg-slate-900/70 border border-amber-200/40 dark:border-amber-900/40">
                    <strong className="text-slate-900 dark:text-white font-semibold">2. Stream URL Format:</strong>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                      Standard RTMP (Port 1935) is often blocked by corporate/cloud firewalls. Stream LIVE automatically streams via <strong>rtmps://a.rtmp.youtube.com/live2:443</strong> (secure TLS over port 443), guaranteed to connect.
                    </p>
                  </div>
                  <div className="p-2 rounded bg-white/70 dark:bg-slate-900/70 border border-amber-200/40 dark:border-amber-900/40">
                    <strong className="text-slate-900 dark:text-white font-semibold">3. Ingest Buffer Time:</strong>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                      YouTube Studio takes 5 to 15 seconds to receive, verify, and buffer live frames before changing from "Waiting for stream" to "Excellent Connection".
                    </p>
                  </div>

                  {getPlatformDashboardUrl(platform) && (
                    <a
                      href={getPlatformDashboardUrl(platform)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors"
                    >
                      <span>Open YouTube Live Studio Now</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Realtime Live Cloud Encoder Logs & Telemetry */}
            {isStreaming && (
              <div className="p-3.5 rounded-xl bg-slate-900 text-white border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-emerald-400">
                      Cloud FFmpeg Encoder: ACTIVE
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLogsDrawer(!showLogsDrawer)}
                    className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 cursor-pointer"
                  >
                    {showLogsDrawer ? 'Hide Logs' : 'View Live Terminal Logs'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-center pt-1 border-t border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px]">BITRATE</span>
                    <span className="text-white font-semibold">{telemetry?.stats?.bitrate || '2500kbits/s'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">FPS</span>
                    <span className="text-emerald-400 font-semibold">{telemetry?.stats?.fps || 30}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">SPEED</span>
                    <span className="text-purple-300 font-semibold">{telemetry?.stats?.speed || '1.0x'}</span>
                  </div>
                </div>

                {showLogsDrawer && (
                  <div className="mt-2 p-2.5 rounded-lg bg-black font-mono text-[10px] text-slate-300 max-h-40 overflow-y-auto space-y-1 border border-slate-800">
                    {telemetry?.logs && telemetry.logs.length > 0 ? (
                      telemetry.logs.map((log, i) => (
                        <div
                          key={i}
                          className={`break-all ${
                            log.includes('error') ? 'text-red-400' : log.includes('bitrate=') ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          {log}
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 italic">Connecting to YouTube RTMP server...</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Auto Start Toggle */}
            <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  Auto-Start Live Stream on Stream Key Update
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Automatically launches 24/7 cloud live broadcast whenever you update or paste a stream key.
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoStartOnKeyUpdate}
                onChange={(e) => {
                  const val = e.target.checked;
                  setAutoStartOnKeyUpdate(val);
                  onUpdateSlot({ ...slot, autoStartOnKeyUpdate: val });
                }}
                className="w-4 h-4 rounded border-slate-300 text-[#6320ee] focus:ring-[#6320ee] cursor-pointer shrink-0"
              />
            </div>
          </div>

          {/* Stream Loop & Stream End Time in 2 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            {/* Stream Loop toggle */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                Stream Loop
              </label>
              <button
                type="button"
                onClick={() => {
                  const val = !streamLoop;
                  setStreamLoop(val);
                  onUpdateSlot({ ...slot, streamLoop: val });
                }}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  streamLoop ? 'bg-[#6320ee]' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                role="switch"
                aria-checked={streamLoop}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    streamLoop ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {streamLoop ? 'Loops endlessly 24/7' : 'Plays once and stops'}
              </p>
            </div>

            {/* Stream End Time */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Stream End Time
              </label>
              <div className="relative flex items-center">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={streamEndTime}
                  onChange={(e) => {
                    setStreamEndTime(e.target.value);
                    onUpdateSlot({ ...slot, streamEndTime: e.target.value });
                  }}
                  className="w-full pl-10 pr-9 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
                  placeholder="October 30th, 2026 04:29 PM"
                />
                {streamEndTime && (
                  <button
                    type="button"
                    onClick={() => {
                      setStreamEndTime('');
                      onUpdateSlot({ ...slot, streamEndTime: '' });
                    }}
                    className="absolute right-2.5 p-1 text-red-500 hover:text-red-700 cursor-pointer"
                    title="Clear end time"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stream Quality & Bitrate Settings Section */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Stream Quality & Bitrate Settings
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      {targetBitrateKbps} Kbps · {fpsPreset} FPS (CBR)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure broadcast encoding bitrate and frame rate to satisfy platform ingest requirements
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Quality Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Quality Presets
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: '720p-2500', name: '720p HD', bitrate: 2500, fps: 30, audio: 128, label: 'YouTube Rec Min' },
                  { id: '1080p-4500', name: '1080p Standard', bitrate: 4500, fps: 30, audio: 128, label: 'Full HD 30fps' },
                  { id: '1080p-5000', name: '1080p Pro', bitrate: 5000, fps: 60, audio: 160, label: 'YouTube 60fps' },
                  { id: '2k-8000', name: '2K / Ultra', bitrate: 8000, fps: 60, audio: 192, label: 'Max Fidelity' },
                ].map((preset) => {
                  const isSelected = targetBitrateKbps === preset.bitrate && fpsPreset === preset.fps;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleQualityPresetSelect(preset)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-[#6320ee]/10 border-[#6320ee] text-[#6320ee] dark:text-purple-300 ring-1 ring-[#6320ee]'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {preset.name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#6320ee]" />}
                      </div>
                      <div className="text-[12px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {preset.bitrate} Kbps
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {preset.fps} FPS · {preset.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fine-Tuning Controls */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
              {/* Bitrate Slider & Number Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>Target Video Bitrate</span>
                    <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                      (YouTube recommends 2500 - 6000 Kbps)
                    </span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1000"
                      max="12000"
                      step="100"
                      value={targetBitrateKbps}
                      onChange={(e) => handleCustomBitrateChange(Number(e.target.value))}
                      className="w-20 px-2 py-1 text-xs font-mono font-bold text-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#6320ee]"
                    />
                    <span className="text-xs font-semibold text-slate-500">Kbps</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="1500"
                  max="10000"
                  step="250"
                  value={targetBitrateKbps}
                  onChange={(e) => handleCustomBitrateChange(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#6320ee]"
                />

                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>1500k</span>
                  <span className="text-emerald-500 font-bold">2500k (Rec)</span>
                  <span className="text-purple-400 font-bold">5000k</span>
                  <span>8000k</span>
                  <span>10000k</span>
                </div>

                {/* Bitrate Recommendation Tip */}
                <div className="mt-2 text-[11px] p-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    {targetBitrateKbps < 2500 ? (
                      <strong className="text-amber-600 dark:text-amber-400">
                        Bitrate is below 2500 Kbps: YouTube Live will show a "bitrate lower than recommended" warning.
                      </strong>
                    ) : targetBitrateKbps <= 3500 ? (
                      <span>Optimal 720p HD streaming. Strictly maintains constant 2500+ Kbps so YouTube never gives warnings.</span>
                    ) : targetBitrateKbps <= 6000 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Excellent 1080p Full HD broadcast bitrate. Delivers ultra crisp 60fps video quality.
                      </span>
                    ) : (
                      <span>Ultra high-bitrate broadcast. Delivers master studio fidelity for high-motion content.</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Frame Rate (FPS) and Audio Bitrate Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Frame Rate */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Frame Rate (FPS)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[30, 60].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => handleFpsChange(f as 30 | 60)}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors cursor-pointer ${
                          fpsPreset === f
                            ? 'bg-[#6320ee] text-white border-[#6320ee]'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {f} FPS {f === 30 ? '(Standard)' : '(High Motion)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audio Bitrate */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Audio Bitrate (AAC Stereo)
                  </label>
                  <select
                    value={audioBitrateKbps}
                    onChange={(e) => handleAudioBitrateChange(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium py-2 px-3 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#6320ee] cursor-pointer"
                  >
                    <option value={128}>128 Kbps (YouTube Standard)</option>
                    <option value={160}>160 Kbps (High Fidelity)</option>
                    <option value={192}>192 Kbps (Pro Audio)</option>
                    <option value={256}>256 Kbps (Studio Master)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Stream Start Section */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-[#6320ee] dark:text-[#a855f7] flex items-center justify-center">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Schedule Stream Start
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Automatically launch broadcast at a future date and time
                  </p>
                </div>
              </div>

              {/* Schedule toggle switch */}
              <button
                type="button"
                onClick={() => {
                  const val = !scheduleStartEnabled;
                  setScheduleStartEnabled(val);
                  onUpdateSlot({ ...slot, scheduleStartEnabled: val });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  scheduleStartEnabled ? 'bg-[#6320ee]' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                role="switch"
                aria-checked={scheduleStartEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    scheduleStartEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {scheduleStartEnabled && (
              <div className="pt-2 flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Stream Start Date & Time
                </label>
                <div className="relative flex items-center">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={streamStartTime}
                    onChange={(e) => {
                      setStreamStartTime(e.target.value);
                      onUpdateSlot({ ...slot, streamStartTime: e.target.value });
                    }}
                    className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
                    placeholder="October 30th, 2026 06:00 PM"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-medium text-slate-400 mr-1">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => applySchedulePreset(15, '+15m')}
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:text-[#6320ee] rounded-md transition-colors cursor-pointer"
                  >
                    +15 mins
                  </button>
                  <button
                    type="button"
                    onClick={() => applySchedulePreset(60, '+1h')}
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:text-[#6320ee] rounded-md transition-colors cursor-pointer"
                  >
                    +1 hour
                  </button>
                  <button
                    type="button"
                    onClick={() => applySchedulePreset(180, '+3h')}
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:text-[#6320ee] rounded-md transition-colors cursor-pointer"
                  >
                    +3 hours
                  </button>
                  <button
                    type="button"
                    onClick={() => applySchedulePreset(24 * 60, 'Tomorrow')}
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:text-[#6320ee] rounded-md transition-colors cursor-pointer"
                  >
                    Tomorrow
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Video Selector / Preview matching Screenshot 1 */}
        <div className="flex flex-col gap-3">
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
            Video
          </label>

          {currentVideo ? (
            /* Selected Video Card / Player */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col">
              <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
                <video
                  src={currentVideo.videoUrl}
                  controls
                  className="w-full h-full object-cover"
                  poster={currentVideo.thumbnailUrl}
                />
              </div>
              <div className="p-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    SELECTED BROADCAST VIDEO
                  </span>
                  <button
                    onClick={handleRemoveVideo}
                    className="p-1 text-slate-400 hover:text-red-600 rounded-md cursor-pointer transition-colors"
                    title="Remove Video"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {currentVideo.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{currentVideo.duration}</span>
                    <span>·</span>
                    <span>{currentVideo.resolution}</span>
                    <span>·</span>
                    <span>{currentVideo.sizeFormatted}</span>
                    <span>·</span>
                    <span className="text-[#6320ee] dark:text-[#a855f7] font-medium">128 kbps Stereo AAC</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">
                    24/7 Loop Ready
                  </span>
                  <button
                    onClick={() => setShowVideoModal(true)}
                    className="font-semibold text-[#6320ee] dark:text-[#a855f7] hover:underline cursor-pointer"
                  >
                    Change Video
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State matching Screenshot 1 */
            <div className="h-72 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-4 p-8 bg-slate-50/50 dark:bg-slate-900/50 text-center">
              <span className="text-base font-semibold text-slate-600 dark:text-slate-300">
                No video selected
              </span>
              <button
                onClick={() => setShowVideoModal(true)}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#6320ee] hover:bg-[#5218cc] rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Video</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Live Stream Monitor Section (if streaming is active) */}
      {isStreaming && (
        <div className="p-6 rounded-2xl bg-slate-900 text-white border border-purple-500/30 shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
              </span>
              <span className="text-base font-bold tracking-tight">
                Live Cloud Broadcast Active
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-emerald-400">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Target: {slot.targetBitrateKbps || 2500} kbps ({slot.qualityPresetName || '1080p'} @ {slot.fpsPreset || 30}fps)
              </span>
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" /> {slot.platform} RTMP
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-300">
            Active 24/7 RTMP Ingest Target: <code className="bg-slate-800 px-2 py-0.5 rounded text-purple-300 font-mono">{slot.rtmpServerUrl || (slot.platform === 'YouTube' ? 'rtmps://a.rtmp.youtube.com:443/live2' : `${slot.platform} RTMP`)}</code>
          </div>
        </div>
      )}

      {/* Bottom Bar: Action Buttons with Schedule Stream support */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
        {isStreaming ? (
          <button
            onClick={() => onToggleStream(slot.id)}
            className="px-8 py-3 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Stop Stream</span>
          </button>
        ) : isScheduled ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancelSchedule}
              className="px-5 py-3 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              Cancel Schedule
            </button>
            <button
              onClick={() => onToggleStream(slot.id)}
              className="px-7 py-3 rounded-lg text-sm font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Stream Now</span>
            </button>
          </div>
        ) : scheduleStartEnabled ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => onToggleStream(slot.id, { targetBitrateKbps, fpsPreset, audioBitrateKbps })}
              className="px-5 py-3 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              Start Stream Immediately
            </button>
            <button
              onClick={handleScheduleSubmit}
              className="px-7 py-3 rounded-lg text-sm font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <CalendarClock className="w-4 h-4" />
              <span>Schedule Stream</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              const targetKey = streamKey.trim();
              if (!targetKey) {
                setNotificationToast('Please paste your YouTube stream key first.');
                setTimeout(() => setNotificationToast(null), 3500);
                return;
              }
              const targetVideoId = selectedVideoId || (videos.length > 0 ? videos[0].id : undefined);
              if (targetVideoId) setSelectedVideoId(targetVideoId);

              onToggleStream(slot.id, {
                streamKey: targetKey,
                platform,
                videoId: targetVideoId,
                targetBitrateKbps,
                fpsPreset,
                audioBitrateKbps,
                streamStatus: 'Live',
              });
            }}
            className="px-8 py-3 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-all cursor-pointer flex items-center gap-2 group"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <Play className="w-4 h-4 fill-current" />
            <span>Start Stream (YouTube Live)</span>
          </button>
        )}
      </div>

      {/* Select Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5 max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Select Video for Slot
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Choose an existing video from your library or navigate to Videos to upload more.
                </p>
              </div>
              <button
                onClick={() => setShowVideoModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex flex-col gap-3 pr-1">
              {videos.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Film className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-medium">No videos found in your library.</p>
                  <button
                    onClick={() => {
                      setShowVideoModal(false);
                      onNavigate('videos');
                    }}
                    className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-[#6320ee] rounded-lg"
                  >
                    Go to Videos to Upload
                  </button>
                </div>
              ) : (
                videos.map((vid) => (
                  <div
                    key={vid.id}
                    onClick={() => handleSelectVideo(vid)}
                    className={`p-3.5 rounded-xl border flex items-center gap-4 transition-all cursor-pointer ${
                      selectedVideoId === vid.id
                        ? 'border-[#6320ee] bg-purple-50/50 dark:bg-purple-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="w-24 h-16 rounded-lg bg-black overflow-hidden shrink-0 relative">
                      <img
                        src={vid.thumbnailUrl}
                        alt={vid.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] text-white px-1 rounded font-mono">
                        {vid.duration}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {vid.title}
                      </h5>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>{vid.resolution}</span>
                        <span>·</span>
                        <span>{vid.sizeFormatted}</span>
                        <span>·</span>
                        <span>{vid.createdAt}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[#6320ee] hover:bg-[#5218cc] rounded-lg shrink-0"
                    >
                      Use Video
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowVideoModal(false);
                  onNavigate('videos');
                }}
                className="text-xs font-semibold text-[#6320ee] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Upload New Video</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowVideoModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
