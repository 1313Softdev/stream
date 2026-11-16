import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Upload,
  Trash2,
  Play,
  Plus,
  X,
  Film,
  CheckCircle2,
  AlertCircle,
  FileVideo,
  Check,
  Loader2,
  ArrowRight,
  Pencil,
  Info,
  RotateCw,
} from 'lucide-react';
import { VideoItem, UserProfile } from '../types';
import { PRESET_SAMPLE_VIDEOS } from '../config/presetVideos';
import { extractVideoMetadata, storeLocalVideoBlob } from '../lib/videoStorage';
import { uploadVideoToServer } from '../lib/streamingService';
import { fetchVideos, updateVideoTitle, reprocessVideo } from '../lib/api';

interface VideosViewProps {
  videos: VideoItem[];
  user?: UserProfile;
  onAddVideo: (video: VideoItem) => void;
  onDeleteVideo: (id: string) => void;
  onUpdateVideo?: (video: VideoItem) => void;
  onRefreshVideos?: () => Promise<void> | void;
  onOpenContact?: () => void;
}

export const VideosView: React.FC<VideosViewProps> = ({
  videos,
  user,
  onAddVideo,
  onDeleteVideo,
  onUpdateVideo,
  onRefreshVideos,
  onOpenContact,
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'preset'>('upload');

  // Custom upload state
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<'uploading' | 'processing' | 'completed'>('uploading');
  const [processingStage, setProcessingStage] = useState<string>('');
  const [filePreviewData, setFilePreviewData] = useState<{
    duration: string;
    resolution: string;
    sizeFormatted: string;
    thumbnailUrl: string;
  } | null>(null);

  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<VideoItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Title editing state
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // Completed conversion notice banner
  const [completedNotice, setCompletedNotice] = useState<{ id: string; title: string } | null>(null);
  const prevStatusesRef = useRef<Record<string, string>>({});

  // Background polling while any video has status === 'processing'
  useEffect(() => {
    videos.forEach((v) => {
      const prev = prevStatusesRef.current[v.id];
      if (prev === 'processing' && v.status === 'ready') {
        setCompletedNotice({ id: v.id, title: v.title });
        setSuccessToast(`✓ "${v.title}" converted to YouTube suitable nonstop streaming!`);
        setTimeout(() => setSuccessToast(null), 5000);
      }
      prevStatusesRef.current[v.id] = v.status || 'ready';
    });

    const hasProcessing = videos.some((v) => v.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(async () => {
      try {
        if (onRefreshVideos) {
          await onRefreshVideos();
        } else {
          const fresh = await fetchVideos(user?.id);
          fresh.forEach((f) => {
            const prev = prevStatusesRef.current[f.id];
            if (prev === 'processing' && f.status === 'ready') {
              setCompletedNotice({ id: f.id, title: f.title });
              setSuccessToast(`✓ "${f.title}" converted to YouTube suitable nonstop streaming!`);
              setTimeout(() => setSuccessToast(null), 5000);
              if (onUpdateVideo) onUpdateVideo(f);
            }
            prevStatusesRef.current[f.id] = f.status || 'ready';
          });
        }
      } catch (err) {
        console.warn('Polling error:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [videos, user?.id, onRefreshVideos, onUpdateVideo]);

  const handleStartEdit = (video: VideoItem) => {
    setEditingVideoId(video.id);
    setEditingTitle(video.title);
  };

  const handleSaveTitle = async (videoId: string) => {
    if (!editingTitle.trim()) return;
    setIsSavingTitle(true);
    try {
      const updated = await updateVideoTitle(videoId, editingTitle.trim());
      if (onUpdateVideo) {
        onUpdateVideo(updated);
      } else if (onRefreshVideos) {
        await onRefreshVideos();
      }
      setSuccessToast(`Title updated to "${editingTitle.trim()}"`);
      setTimeout(() => setSuccessToast(null), 3000);
      setEditingVideoId(null);
    } catch (err: any) {
      console.error('Failed to update title:', err);
      setErrorToast(err?.message || 'Failed to update title');
      setTimeout(() => setErrorToast(null), 3000);
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingVideoId(null);
    setEditingTitle('');
  };

  const handleReprocess = async (videoId: string) => {
    try {
      await reprocessVideo(videoId);
      setSuccessToast('Started optimization for YouTube 24/7 streaming...');
      setTimeout(() => setSuccessToast(null), 3000);
      if (onRefreshVideos) await onRefreshVideos();
    } catch (err: any) {
      setErrorToast(err?.message || 'Failed to trigger optimization');
      setTimeout(() => setErrorToast(null), 3000);
    }
  };

  // Storage calculations: user quota or default 10 GB
  const maxStorageBytes = user?.storageQuotaBytes || 10 * 1024 * 1024 * 1024;
  const usedStorageBytes = videos.reduce((acc, v) => acc + (v.sizeBytes || 0), 0);
  const usedGB = (usedStorageBytes / (1024 * 1024 * 1024)).toFixed(1);
  const availableGB = (Math.max(0, maxStorageBytes - usedStorageBytes) / (1024 * 1024 * 1024)).toFixed(1);
  const storagePercent = Math.min(100, Math.round((usedStorageBytes / maxStorageBytes) * 100));

  const handleFileChange = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mkv|mov|webm|avi|flv)$/i)) {
      setErrorToast('Please upload a valid video file (MP4, WebM, MOV, or MKV).');
      setTimeout(() => setErrorToast(null), 4000);
      return;
    }

    if (file.size > 2 * 1024 * 1024 * 1024) {
      setErrorToast('The selected file exceeds the 2 GB maximum file limit.');
      setTimeout(() => setErrorToast(null), 4000);
      return;
    }

    setSelectedFile(file);
    if (!customTitle.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setCustomTitle(cleanName);
    }

    // Client-side metadata preview extraction (does not start upload or fake progress bar)
    setIsAnalyzingFile(true);

    try {
      const meta = await extractVideoMetadata(file);
      setFilePreviewData(meta);
    } catch (err) {
      console.warn('Metadata extraction fallback:', err);
    } finally {
      setIsAnalyzingFile(false);
    }
  };

  const handleCustomUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStage('uploading');
    setProcessingStage('Preparing video upload...');
    const videoId = `vid-${Date.now()}`;

    let videoUrl = customUrl.trim();
    let duration = '32:15';
    let sizeBytes = 450 * 1024 * 1024;
    let sizeFormatted = '450 MB';
    let resolution = '1080p 60fps';
    let thumbnailUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';

    let videoPath: string | undefined = undefined;
    let progressTimer: any = null;

    if (selectedFile) {
      sizeBytes = selectedFile.size;
      const sizeMB = sizeBytes / (1024 * 1024);
      sizeFormatted = sizeMB >= 1000 ? `${(sizeMB / 1024).toFixed(1)} GB` : `${Math.round(sizeMB)} MB`;

      setProcessingStage(`Uploading: 0.0 MB / ${sizeFormatted} (0%)`);

      // Upload directly to server so 24/7 cloud FFmpeg can stream the actual file
      try {
        const uploadResult = await uploadVideoToServer(selectedFile, (rawPercent, loadedBytes, totalBytes) => {
          if (rawPercent < 100) {
            // Scale real byte transmission to 0% - 88%
            const scaled = Math.min(88, Math.max(1, Math.round(rawPercent * 0.88)));
            setUploadProgress(scaled);
            const loadedMB = (loadedBytes / (1024 * 1024)).toFixed(1);
            const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
            setProcessingStage(`Uploading to cloud: ${loadedMB} MB / ${totalMB} MB (${rawPercent}%)`);
          } else {
            // All bytes sent to server! Enter server-side verification & processing phase (90% - 98%)
            setUploadStage('processing');
            setUploadProgress(90);
            setProcessingStage('Processing video on server & generating 24/7 stream link...');

            if (!progressTimer) {
              let cur = 90;
              progressTimer = setInterval(() => {
                cur += 1;
                if (cur <= 98) {
                  setUploadProgress(cur);
                }
              }, 400);
            }
          }
        });

        if (progressTimer) {
          clearInterval(progressTimer);
          progressTimer = null;
        }

        if (uploadResult.success && uploadResult.videoPath) {
          videoPath = uploadResult.videoPath;
          videoUrl = uploadResult.url || videoUrl;
        } else if (uploadResult.error) {
          throw new Error(uploadResult.error);
        }
      } catch (err: any) {
        if (progressTimer) {
          clearInterval(progressTimer);
          progressTimer = null;
        }
        console.warn('Server storage error:', err);
        setErrorToast(err.message || 'Video upload failed. Please try again.');
        setTimeout(() => setErrorToast(null), 4000);
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }

      if (filePreviewData) {
        duration = filePreviewData.duration;
        resolution = filePreviewData.resolution;
        thumbnailUrl = filePreviewData.thumbnailUrl;
      }
    } else if (!videoUrl) {
      videoUrl = '/videos/lofi-chill.mp4';
      videoPath = 'public/videos/lofi-chill.mp4';
    }

    // Phase 3: Completed! ONLY NOW show 100% and ready state
    setUploadStage('completed');
    setUploadProgress(100);
    setProcessingStage(selectedFile ? '✓ Video uploaded! Starting YouTube nonstop optimization...' : '✓ Video processed & ready! Added to library.');

    const newVideo: VideoItem = {
      id: videoId,
      userId: user?.id,
      title: customTitle.trim(),
      duration,
      sizeBytes,
      sizeFormatted,
      resolution,
      thumbnailUrl,
      videoUrl,
      ...(videoPath ? { videoPath } : {}),
      createdAt: 'Just now',
      category: 'Uploaded Stream',
      status: selectedFile ? 'processing' : 'ready',
      processedForYouTube: !selectedFile,
      processingMessage: selectedFile
        ? 'Optimizing for YouTube nonstop 24/7 live streaming...'
        : 'Converted to YouTube suitable nonstop streaming',
    };

    onAddVideo(newVideo);

    // Brief pause to display complete state before modal dismiss
    setTimeout(() => {
      setIsUploading(false);
      setShowUploadModal(false);
      setSelectedFile(null);
      setFilePreviewData(null);
      setCustomTitle('');
      setCustomUrl('');
      setUploadProgress(0);

      setSuccessToast(
        selectedFile
          ? `"${newVideo.title}" uploaded! Converting for YouTube nonstop streaming...`
          : `"${newVideo.title}" was added to your 24/7 video library!`
      );
      setTimeout(() => setSuccessToast(null), 4000);
    }, 450);
  };

  const handleAddPresetVideo = (preset: VideoItem) => {
    if (videos.some((v) => v.id === preset.id)) {
      setErrorToast('This sample video is already in your library.');
      setTimeout(() => setErrorToast(null), 3000);
      return;
    }
    onAddVideo(preset);
    setShowUploadModal(false);
    setSuccessToast(`Added "${preset.title}" to your library.`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleConfirmDelete = async () => {
    if (!videoToDelete) return;
    setIsDeleting(true);
    const title = videoToDelete.title;
    try {
      await onDeleteVideo(videoToDelete.id);
      setSuccessToast(`Video "${title}" was permanently removed from your library.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error('Delete error', err);
      setErrorToast('Failed to delete video. Please try again.');
      setTimeout(() => setErrorToast(null), 3000);
    } finally {
      setIsDeleting(false);
      setVideoToDelete(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
      {/* Toast Notifications */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {errorToast && (
        <div className="fixed top-20 right-6 z-50 bg-red-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{errorToast}</span>
        </div>
      )}

      {/* Title & Storage Bar & Upload button matching screenshot */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Videos
            </h2>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 ml-4">
              <span>App</span>
              <span>&gt;</span>
              <span className="text-[#6320ee] dark:text-[#a855f7]">Videos</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Storage Bar Indicator */}
          <div className="flex flex-col gap-1.5 w-full md:w-72">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Storage
              </span>
              <span className="font-mono tabular-nums">
                {usedGB} GB / {(maxStorageBytes / (1024 * 1024 * 1024)).toFixed(0)} GB
              </span>
            </div>

            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${storagePercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
              <span>{availableGB} GB available</span>
              <span>Max file: 2 GB</span>
            </div>
          </div>

          {/* Upload Button matching screenshot */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#6320ee] hover:bg-[#5218cc] rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-2 shrink-0 self-center"
          >
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* Video Processing Info Banner matching user screenshot */}
      <div className="w-full bg-[#fef7ea] dark:bg-amber-950/20 border border-[#fde1b6] dark:border-amber-800/60 rounded-xl px-4 py-3 flex items-start sm:items-center gap-3 text-xs sm:text-sm text-[#8c5000] dark:text-amber-200 shadow-2xs">
        <Info className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5 sm:mt-0" />
        <div className="flex-1 leading-relaxed">
          Video processing can take maximum 1 hour depending on the size and duration, most videos get processed within 10 minutes. Facing any issues? Please{' '}
          <button
            type="button"
            onClick={onOpenContact}
            className="font-bold underline hover:text-[#5c3400] dark:hover:text-amber-100 cursor-pointer inline"
          >
            Contact us.
          </button>
        </div>
      </div>

      {/* YouTube Optimization Completion Banner */}
      {completedNotice && (
        <div className="w-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold">✓ Converted to YouTube suitable nonstop streaming!</span>{' '}
              <span className="text-emerald-800 dark:text-emerald-300">
                "{completedNotice.title}" is fully optimized with fast-start &amp; 24/7 keyframes. Ready for nonstop broadcast!
              </span>
            </div>
          </div>
          <button
            onClick={() => setCompletedNotice(null)}
            className="p-1 text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 rounded cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content: Empty State or Video Grid */}
      {videos.length === 0 ? (
        /* Empty State */
        <div className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-16 sm:p-24 text-center bg-white dark:bg-slate-900 shadow-2xs">
          <div className="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-6">
            <Video className="w-10 h-10 stroke-1" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Upload your first video
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-8">
            Upload your pre-recorded videos to stream them later or keep them in your library
          </p>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-[#6320ee] hover:bg-[#5218cc] rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </button>
        </div>
      ) : (
        /* Populated Video Grid */
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Video Library ({videos.length})
            </h3>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#6320ee] hover:bg-[#5218cc] rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Video</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => {
              const isProcessing = video.status === 'processing';
              const isFailed = video.status === 'failed';
              const isReady = !isProcessing && !isFailed;

              return (
                <div
                  key={video.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs group flex flex-col justify-between"
                >
                  <div className="relative aspect-video bg-slate-900 overflow-hidden">
                    {/* Status Badge in top right matching screenshot */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      {isProcessing && (
                        <span className="bg-[#f59e0b] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md shadow-md flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin stroke-[2.5]" />
                          Processing
                        </span>
                      )}
                      {isReady && video.processedForYouTube && (
                        <span className="bg-emerald-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-md shadow-md flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          YouTube 24/7 Ready
                        </span>
                      )}
                      {isFailed && (
                        <span className="bg-red-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-md shadow-md flex items-center gap-1">
                          Failed
                        </span>
                      )}
                    </div>

                    {/* Thumbnail Image or Processing Graphic matching screenshot */}
                    {isProcessing ? (
                      <div className="w-full h-full bg-[#1e293b] flex items-center justify-center relative">
                        <div className="relative flex items-center justify-center">
                          <div className="w-16 h-12 bg-[#334155] rounded-xl flex items-center justify-center shadow-inner">
                            <Play className="w-6 h-6 text-slate-100 fill-slate-100 ml-0.5 opacity-90" />
                          </div>
                          <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-[#f59e0b] flex items-center justify-center shadow-md">
                            <Upload className="w-3.5 h-3.5 text-slate-900 stroke-[2.5]" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    )}

                    {!isProcessing && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => setPreviewVideo(video)}
                          className="w-12 h-12 rounded-full bg-white/90 text-[#6320ee] flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Play className="w-5 h-5 ml-0.5 fill-current" />
                        </button>
                      </div>
                    )}

                    <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-xs text-xs font-mono text-white px-2 py-0.5 rounded">
                      {video.duration || '00:00'}
                    </span>
                  </div>

                  <div className="p-4 flex flex-col gap-2">
                    {/* Title Row with inline edit (Pencil) & Delete (Trash) matching screenshot */}
                    {editingVideoId === video.id ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTitle(video.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="flex-1 px-2 py-1 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#6320ee]"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveTitle(video.id)}
                          disabled={isSavingTitle}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded cursor-pointer"
                          title="Save Title"
                        >
                          {isSavingTitle ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          )}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={video.title}>
                          {video.title}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleStartEdit(video)}
                            className="p-1 text-slate-400 hover:text-[#6320ee] dark:hover:text-[#a855f7] rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Title"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setVideoToDelete(video)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Delete Video"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* YouTube Nonstop Streaming Status */}
                    {isProcessing ? (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                        <span>Converting for YouTube nonstop streaming...</span>
                      </div>
                    ) : isFailed ? (
                      <div className="flex items-center justify-between text-xs text-red-600 dark:text-red-400 font-medium">
                        <span>Conversion failed</span>
                        <button
                          onClick={() => handleReprocess(video.id)}
                          className="underline hover:text-red-700 cursor-pointer flex items-center gap-1"
                        >
                          <RotateCw className="w-3 h-3" /> Retry
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Converted to YouTube suitable nonstop streaming</span>
                      </div>
                    )}

                    {/* Metadata line */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{video.resolution || '1080p'}</span>
                      <span>·</span>
                      <span>{video.sizeFormatted || '0 MB'}</span>
                      <span>·</span>
                      <span>{video.createdAt || 'Added'}</span>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => setPreviewVideo(video)}
                        className="text-xs font-semibold text-[#6320ee] dark:text-[#a855f7] hover:underline cursor-pointer"
                      >
                        Preview Video
                      </button>
                      <button
                        onClick={() => setVideoToDelete(video)}
                        className="text-xs text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Video Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Add Video to Stream LIVE
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Upload MP4/MOV videos or pick from ready-to-stream 24/7 video loops.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                  setFilePreviewData(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Segmented Tabs */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Upload File or Link
              </button>
              <button
                onClick={() => setActiveTab('preset')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === 'preset'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Ready-to-Stream Presets
              </button>
            </div>

            {activeTab === 'upload' ? (
              <form onSubmit={handleCustomUploadSubmit} className="flex flex-col gap-4">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                {/* Drag and Drop Zone with active handlers */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isUploading) setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (!isUploading && e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileChange(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => {
                    if (!isUploading && !isAnalyzingFile) {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center justify-center gap-2 transition-all ${
                    isUploading
                      ? 'opacity-60 cursor-not-allowed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
                      : isDragging
                      ? 'border-[#6320ee] bg-purple-50 dark:bg-purple-950/40 scale-[1.01] cursor-pointer'
                      : selectedFile
                      ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 cursor-pointer'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-[#6320ee] cursor-pointer'
                  }`}
                >
                  {isAnalyzingFile ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Loader2 className="w-8 h-8 animate-spin text-[#6320ee]" />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Analyzing video & generating snapshot preview...
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Extracting resolution, duration, and thumbnail
                      </span>
                    </div>
                  ) : selectedFile ? (
                    <div className="flex flex-col items-center gap-2 w-full">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
                        <Check className="w-6 h-6 stroke-2" />
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs">
                          {selectedFile.name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {filePreviewData
                            ? `${filePreviewData.resolution} · ${filePreviewData.duration} · ${filePreviewData.sizeFormatted}`
                            : `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`}
                        </span>
                      </div>
                      {!isUploading && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setFilePreviewData(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="text-[11px] font-semibold text-red-500 hover:underline mt-1"
                        >
                          Choose another file
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#6320ee] dark:text-[#a855f7] flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Click to browse or drag and drop video file
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Supports MP4, WebM, MOV · Up to 2GB storage
                      </span>
                    </>
                  )}
                </div>

                {/* Real-time Upload & Server Processing Progress Bar */}
                {isUploading && (
                  <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 shadow-xs animate-in fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#6320ee] dark:text-[#a855f7] flex items-center gap-2">
                        {uploadStage === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        )}
                        <span>{processingStage}</span>
                      </span>
                      <span className="font-mono font-bold text-[#6320ee] dark:text-[#a855f7] shrink-0 ml-2">
                        {uploadProgress}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-purple-200/70 dark:bg-purple-900/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-200 ease-out ${
                          uploadStage === 'completed' ? 'bg-emerald-500' : 'bg-[#6320ee]'
                        }`}
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Video Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Video Title*
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. 24/7 Lo-Fi Chill Stream Broadcast"
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
                    required
                  />
                </div>

                {/* Alternative Direct Video URL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Direct Video Stream URL (Optional if file uploaded)
                  </label>
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://example.com/stream-video.mp4"
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Leave blank to use uploaded file or high-speed cloud sample demo stream.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isUploading) {
                        setShowUploadModal(false);
                        setSelectedFile(null);
                        setFilePreviewData(null);
                      }
                    }}
                    disabled={isUploading}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 rounded-lg cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || isAnalyzingFile || (!selectedFile && !customTitle.trim())}
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#6320ee] hover:bg-[#5218cc] disabled:opacity-50 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{uploadStage === 'processing' ? 'Processing...' : 'Uploading...'}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload & Save Video</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Presets tab */
              <div className="flex flex-col gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Select one of our tested copyright-free 24/7 stream loops:
                </span>
                {PRESET_SAMPLE_VIDEOS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleAddPresetVideo(preset)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#6320ee] hover:bg-purple-50/40 dark:hover:bg-purple-950/20 flex items-center justify-between gap-3 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-10 rounded bg-black overflow-hidden shrink-0">
                        <img
                          src={preset.thumbnailUrl}
                          alt={preset.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                          {preset.title}
                        </h5>
                        <span className="text-[11px] text-slate-500">
                          {preset.duration} · {preset.sizeFormatted} · {preset.category}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-2.5 py-1 text-xs font-semibold text-white bg-[#6320ee] rounded-md shrink-0"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-black rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
            <div className="p-3 bg-slate-900 flex items-center justify-between text-white">
              <span className="text-sm font-semibold truncate px-2">{previewVideo.title}</span>
              <button
                onClick={() => setPreviewVideo(null)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              <video
                src={previewVideo.videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {videoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 stroke-2" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Delete Video?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Are you sure you want to remove this video from your cloud library?
                </p>
              </div>
            </div>

            {/* Video preview badge in modal */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <div className="w-16 h-11 rounded-lg bg-black overflow-hidden shrink-0">
                <img
                  src={videoToDelete.thumbnailUrl}
                  alt={videoToDelete.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {videoToDelete.title}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {videoToDelete.duration} · {videoToDelete.sizeFormatted} · {videoToDelete.resolution}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              This video will be permanently removed from your library and unlinked from any active live slots.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVideoToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Video</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
