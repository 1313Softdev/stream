import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Radio,
  Activity,
  Square,
  CheckCircle2,
  ExternalLink,
  Volume2,
  VolumeX,
  Key,
  RefreshCw,
  Edit2,
  Zap,
  Terminal,
  HelpCircle,
  Copy,
  AlertTriangle,
  Clock,
  Layers,
  Gauge,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Slot, VideoItem } from '../types';
import { fetchStreamStatus, StreamTelemetry, startCloudStream } from '../lib/streamingService';

interface LiveStreamSimulatorModalProps {
  isOpen: boolean;
  slot: Slot;
  video?: VideoItem;
  slots?: Slot[];
  videos?: VideoItem[];
  onSelectSlot?: (slot: Slot) => void;
  onClose: () => void;
  onStopStream: () => void;
  onUpdateStreamKey?: (newKey: string) => void;
}

export const LiveStreamSimulatorModal: React.FC<LiveStreamSimulatorModalProps> = ({
  isOpen,
  slot,
  video,
  slots,
  videos,
  onSelectSlot,
  onClose,
  onStopStream,
  onUpdateStreamKey,
}) => {
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState(slot.streamKey);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [keySwapToast, setKeySwapToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'telemetry' | 'guide'>('logs');
  const [telemetry, setTelemetry] = useState<StreamTelemetry | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNewKeyInput(slot.streamKey);
    setIsAlertDismissed(false);
  }, [slot.streamKey, slot.id]);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch real telemetry from backend FFmpeg streaming worker
    const pollTelemetry = async () => {
      try {
        const data = await fetchStreamStatus(slot.id);
        setTelemetry(data);
        if (data.uptimeSeconds !== undefined) {
          setUptimeSeconds(data.uptimeSeconds);
        }
      } catch (e) {
        console.warn('Telemetry polling error:', e);
      }
    };

    pollTelemetry();
    const teleInterval = setInterval(pollTelemetry, 1500);

    return () => {
      clearInterval(teleInterval);
    };
  }, [isOpen, slot.id]);

  // Auto-scroll encoder logs
  useEffect(() => {
    if (activeTab === 'logs' && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [telemetry?.logs, activeTab]);

  const handleApplyNewKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyInput.trim();
    if (!trimmed) return;

    setIsReconnecting(true);
    try {
      const res = await startCloudStream({
        slotId: slot.id,
        streamKey: trimmed,
        platform: slot.platform,
        customRtmpUrl: slot.rtmpServerUrl,
        videoPath: (video as any)?.videoPath || (video?.videoUrl?.startsWith('/uploads') ? `public${video.videoUrl}` : 'public/videos/lofi-chill.mp4'),
        targetBitrateKbps: slot.targetBitrateKbps,
        fps: slot.fpsPreset,
        audioBitrateKbps: slot.audioBitrateKbps,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to reconnect with new key');
      }

      if (onUpdateStreamKey) {
        onUpdateStreamKey(trimmed);
      }
      setIsEditingKey(false);
      setKeySwapToast('Stream Key updated: Cloud encoder reconnected with new key!');
      setTimeout(() => setKeySwapToast(null), 4000);
    } catch (err: any) {
      setKeySwapToast(`Error: ${err.message || 'Failed to reconnect'}`);
      setTimeout(() => setKeySwapToast(null), 4000);
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleResetToDefaultAndReconnect = async () => {
    setIsReconnecting(true);
    try {
      const res = await startCloudStream({
        slotId: slot.id,
        streamKey: newKeyInput.trim() || slot.streamKey,
        platform: slot.platform,
        customRtmpUrl: slot.rtmpServerUrl,
        videoPath: 'public/videos/lofi-chill.mp4',
        targetBitrateKbps: 2500,
        fps: 30,
        audioBitrateKbps: 128,
      });
      if (res.success) {
        setKeySwapToast('Reset to default stream parameters & reconnecting...');
        setTimeout(() => setKeySwapToast(null), 4000);
      } else {
        throw new Error(res.error || 'Failed to reconnect with defaults');
      }
    } catch (err: any) {
      setKeySwapToast(`Error: ${err?.message || 'Failed to reset'}`);
      setTimeout(() => setKeySwapToast(null), 4000);
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleCopyKey = () => {
    if (slot.streamKey) {
      navigator.clipboard.writeText(slot.streamKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  if (!isOpen) return null;

  const formatUptime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getStudioLink = () => {
    switch (slot.platform) {
      case 'YouTube':
        return 'https://studio.youtube.com/channel/live';
      case 'Facebook':
        return 'https://www.facebook.com/live/producer';
      case 'Twitch':
        return 'https://dashboard.twitch.tv/stream-manager';
      default:
        return '';
    }
  };

  const isLive = telemetry?.status === 'live';
  const isStarting = telemetry?.status === 'starting';
  const isError = telemetry?.status === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 text-white rounded-3xl max-w-5xl w-full overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]">
        {/* Key Swap Toast Alert inside modal */}
        {keySwapToast && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{keySwapToast}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                isLive ? 'bg-red-400 opacity-75' : isStarting ? 'bg-amber-400 opacity-75' : 'bg-slate-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                isLive ? 'bg-red-500' : isStarting ? 'bg-amber-500' : 'bg-slate-500'
              }`}></span>
            </span>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Live Broadcast Monitor · {slot.name}
              </h3>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isLive
                  ? 'bg-red-600 text-white'
                  : isStarting
                  ? 'bg-amber-500 text-slate-950'
                  : isError
                  ? 'bg-red-900 text-red-200'
                  : 'bg-slate-700 text-slate-300'
              }`}>
                {telemetry?.status || 'Active'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {getStudioLink() && (
              <a
                href={getStudioLink()}
                target="_blank"
                rel="noreferrer noopener"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer"
              >
                <span>Open {slot.platform} Studio</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatUptime(uptimeSeconds)}</span>
            </span>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              aria-label="Close broadcast monitor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Multi-Slot Switcher Bar */}
        {slots && slots.length > 1 && (
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 overflow-x-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 shrink-0">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Multi-Stream Slots:</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto py-0.5">
              {slots.map((s) => {
                const isSelected = s.id === slot.id;
                const isSlotLive = s.streamStatus === 'Live';
                return (
                  <button
                    key={s.id}
                    onClick={() => onSelectSlot && onSelectSlot(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-[#6320ee] text-white shadow-xs font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isSlotLive ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
                    <span>{s.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">({s.platform})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Content: Video Stream (Left) & Real Telemetry / Terminal (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Video Player Column */}
          <div className="lg:col-span-7 flex flex-col bg-black">
            <div className="relative aspect-video flex items-center justify-center bg-black overflow-hidden group">
              <video
                src={video?.videoUrl || '/videos/lofi-chill.mp4'}
                autoPlay
                loop={slot.streamLoop}
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Real Stream Status Overlay */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded shadow-md flex items-center gap-1.5 ${
                  isLive
                    ? 'bg-red-600 text-white animate-pulse'
                    : isStarting
                    ? 'bg-amber-500 text-black'
                    : 'bg-slate-800 text-slate-200'
                }`}>
                  <Radio className="w-3 h-3" />
                  <span>{isLive ? 'ON AIR' : isStarting ? 'STARTING...' : 'BROADCASTING'}</span>
                </span>
                <span className="bg-black/80 backdrop-blur-xs text-slate-300 text-xs px-2.5 py-1 rounded font-mono">
                  {slot.platform} Live
                </span>
              </div>

              {/* Sound toggle button */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="absolute bottom-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 cursor-pointer"
                title={isMuted ? 'Unmute local preview' : 'Mute local preview'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Real Telemetry Metric Cards */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 grid grid-cols-4 gap-2 text-center text-xs">
              <div className="flex flex-col">
                <span className="text-slate-400">Encoder Status</span>
                <span className={`font-semibold capitalize mt-0.5 ${
                  isLive ? 'text-emerald-400' : isStarting ? 'text-amber-400' : 'text-slate-300'
                }`}>
                  {telemetry?.status || 'Running'}
                </span>
              </div>
              <div className="flex flex-col border-l border-slate-800">
                <span className="text-slate-400">Bitrate</span>
                <span className="font-mono text-white mt-0.5">
                  {telemetry?.stats?.bitrate || `${slot.targetBitrateKbps || 2500}kbits/s`}
                </span>
              </div>
              <div className="flex flex-col border-l border-slate-800">
                <span className="text-slate-400">FPS</span>
                <span className="font-mono text-white mt-0.5">
                  {telemetry?.stats?.fps || slot.fpsPreset || 30} fps
                </span>
              </div>
              <div className="flex flex-col border-l border-slate-800">
                <span className="text-slate-400">Frames Encoded</span>
                <span className="font-mono text-purple-300 mt-0.5">
                  {telemetry?.stats?.frames || 0}
                </span>
              </div>
            </div>

            {/* Real Stream Key Update Bar */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-slate-300 font-semibold">Stream Key:</span>
                  <span className="font-mono text-purple-300">
                    ••••••••{slot.streamKey ? slot.streamKey.slice(-4) : 'none'}
                  </span>
                  <button
                    onClick={handleCopyKey}
                    className="p-1 text-slate-400 hover:text-white rounded"
                    title="Copy stream key"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingKey(!isEditingKey)}
                  className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isEditingKey ? 'Cancel' : 'Update Key Live'}</span>
                </button>
              </div>

              {isEditingKey && (
                <form onSubmit={handleApplyNewKey} className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={newKeyInput}
                    onChange={(e) => setNewKeyInput(e.target.value)}
                    placeholder="Enter new stream key from YouTube Studio"
                    className="flex-1 px-3 py-1.5 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isReconnecting}
                    className="px-3 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    {isReconnecting ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Reconnecting...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3" />
                        <span>Apply & Reconnect</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Real Terminal Logs & Encoder Telemetry */}
          <div className="lg:col-span-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/90">
            {/* Tab navigation */}
            <div className="p-2 border-b border-slate-800 flex items-center gap-1 bg-slate-950/60">
              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-md flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  activeTab === 'logs'
                    ? 'bg-[#6320ee] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Terminal className="w-3 h-3" />
                <span>Encoder Logs</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('telemetry')}
                className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-md flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  activeTab === 'telemetry'
                    ? 'bg-[#6320ee] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Activity className="w-3 h-3" />
                <span>Diagnostics</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-md flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  activeTab === 'guide'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800/60'
                }`}
              >
                <HelpCircle className="w-3 h-3" />
                <span>Setup Guide</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-2.5 max-h-64 lg:max-h-96 text-xs">
              {activeTab === 'logs' && (
                <div className="flex flex-col gap-1 font-mono text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex-1 overflow-y-auto max-h-80">
                  <div className="flex items-center justify-between text-slate-400 pb-1.5 mb-1 border-b border-slate-800/80">
                    <span className="flex items-center gap-1 text-purple-400 font-bold">
                      <Terminal className="w-3.5 h-3.5" /> Real-time FFmpeg Console
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Streaming
                    </span>
                  </div>

                  {telemetry?.logs && telemetry.logs.length > 0 ? (
                    telemetry.logs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`break-all py-0.5 leading-relaxed ${
                          log.includes('error') || log.includes('Error') || log.includes('rejected')
                            ? 'text-red-400 font-bold'
                            : log.includes('bitrate=')
                            ? 'text-emerald-300'
                            : log.includes('Stream LIVE') || log.includes('StreamAdda')
                            ? 'text-purple-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic py-6 text-center">
                      Connecting to RTMP encoder... waiting for stream buffer.
                    </div>
                  )}

                  {!isLive && !isAlertDismissed && telemetry?.status === 'error' && telemetry?.lastError && (
                    <div className="mt-2 p-3.5 rounded-xl bg-red-950/90 border border-red-800 text-red-200 text-xs font-sans space-y-3 shadow-lg">
                      <div className="font-bold flex items-center justify-between text-red-300">
                        <div className="flex items-center gap-1.5 text-sm">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                          <span>Stream Key Connection Alert</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStudioLink() && (
                            <a
                              href={getStudioLink()}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold text-[11px] transition-colors"
                            >
                              <span>Open {slot.platform} Studio</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsAlertDismissed(true)}
                            className="p-1 rounded-md text-red-300 hover:text-white hover:bg-red-900/60 transition-colors cursor-pointer"
                            title="Dismiss alert"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-red-200/90 leading-relaxed text-xs">{telemetry.lastError}</p>

                      <div className="p-3 rounded-lg bg-black/40 border border-red-900/60 space-y-2">
                        <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                          <span>Paste Active Stream Key & Reconnect:</span>
                          <span className="text-[10px] text-slate-400">From YouTube Studio Live tab</span>
                        </div>
                        <form onSubmit={handleApplyNewKey} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newKeyInput}
                            onChange={(e) => setNewKeyInput(e.target.value)}
                            placeholder="Paste real YouTube Stream Key here..."
                            className="flex-1 px-3 py-1.5 text-xs font-mono bg-slate-950 border border-red-800/80 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-red-400"
                            required
                          />
                          <button
                            type="submit"
                            disabled={isReconnecting}
                            className="px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-sm flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                          >
                            {isReconnecting ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Connecting...</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3" />
                                <span>Apply & Reconnect</span>
                              </>
                            )}
                          </button>
                        </form>

                        <div className="pt-2 border-t border-red-900/60 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Encountering encoder or parameter errors?</span>
                          <button
                            type="button"
                            onClick={handleResetToDefaultAndReconnect}
                            disabled={isReconnecting}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-purple-300 font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3 text-purple-400" />
                            <span>Reset to Defaults (720p) & Reconnect</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={terminalEndRef} />
                </div>
              )}

              {activeTab === 'telemetry' && (
                <div className="flex flex-col gap-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                      Broadcast Telemetry
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Platform</span>
                        <span className="font-semibold text-slate-200">{slot.platform}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Loop Mode</span>
                        <span className="font-semibold text-emerald-400">24/7 Infinite Loop</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Target Bitrate</span>
                        <span className="font-mono text-slate-200">{slot.targetBitrateKbps || 2500} kbps CBR</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Keyframe Interval</span>
                        <span className="font-mono text-slate-200">2.0s ({((slot.fpsPreset || 30) * 2)} frames)</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Video Codec</span>
                        <span className="font-mono text-slate-200">H.264 (libx264 veryfast)</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Audio Codec</span>
                        <span className="font-mono text-slate-200">AAC 44.1kHz Stereo</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-300">Video Source</div>
                    <div className="font-mono text-purple-300 text-xs break-all">
                      {video?.title || 'Preset Broadcast Video'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      File: {video?.videoUrl || 'lofi-chill.mp4'}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'guide' && (
                <div className="flex flex-col gap-2.5 text-slate-200">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs pb-1 border-b border-slate-800">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>How YouTube Live Ingest Works</span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="font-bold text-purple-300 mb-0.5">1. Copy Active Stream Key</div>
                      <p className="text-slate-400">
                        Go to <strong className="text-white">YouTube Studio → Go Live</strong>. Copy the Stream Key and paste it into this slot.
                      </p>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="font-bold text-purple-300 mb-0.5">2. Enable Auto-Start in YouTube</div>
                      <p className="text-slate-400">
                        In YouTube Studio settings, enable <strong className="text-white">"Enable Auto-start"</strong> so YouTube goes live online immediately when RTMP packets arrive.
                      </p>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="font-bold text-purple-300 mb-0.5">3. 10–15s Buffer Delay</div>
                      <p className="text-slate-400">
                        YouTube requires 10 to 15 seconds to buffer RTMP chunks before marking the stream "Excellent Connection".
                      </p>
                    </div>
                  </div>

                  {getStudioLink() && (
                    <a
                      href={getStudioLink()}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-1 w-full py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <span>Open YouTube Live Studio</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* RTMP Server info & Stop button */}
            <div className="p-4 border-t border-slate-800 flex flex-col gap-3 bg-slate-950">
              <div className="text-[11px] text-slate-400">
                Broadcasting via <span className="text-white font-mono">{slot.platform} RTMP</span>. You may close this monitor; the cloud worker continues streaming in the background.
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onStopStream();
                    onClose();
                  }}
                  className="flex-1 py-2 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Stream</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Keep Running
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
