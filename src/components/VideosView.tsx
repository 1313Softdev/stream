import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { VideoItem, UserProfile } from '../types';
import { PRESET_SAMPLE_VIDEOS } from '../config/presetVideos';
import { extractVideoMetadata, storeLocalVideoBlob } from '../lib/videoStorage';
import { uploadVideoToServer } from '../lib/streamingService';

interface VideosViewProps {
  videos: VideoItem[];
  user?: UserProfile;
  onAddVideo: (video: VideoItem) => void;
  onDeleteVideo: (id: string) => void;
}

export const VideosView: React.FC<VideosViewProps> = ({
  videos,
  user,
  onAddVideo,
  onDeleteVideo,
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'preset'>('upload');

  // Custom upload state
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<string>('Processing video & generating live snapshot...');
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

    setIsProcessing(true);
    setProcessingStage('Analyzing video & generating live snapshot...');
    setUploadProgress(20);

    try {
      // Extract video duration, resolution, thumbnail
      const meta = await extractVideoMetadata(file);
      setFilePreviewData(meta);
      setUploadProgress(100);

      setTimeout(() => {
        setIsProcessing(false);
        setUploadProgress(0);
      }, 350);
    } catch (err) {
      console.warn('Metadata extraction fallback:', err);
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleCustomUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    setIsProcessing(true);
    setUploadProgress(0);
    setProcessingStage('Preparing video upload...');
    const videoId = `vid-${Date.now()}`;

    let videoUrl = customUrl.trim();
    let duration = '32:15';
    let sizeBytes = 450 * 1024 * 1024;
    let sizeFormatted = '450 MB';
    let resolution = '1080p 60fps';
    let thumbnailUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';

    let videoPath: string | undefined = undefined;

    if (selectedFile) {
      sizeBytes = selectedFile.size;
      const sizeMB = sizeBytes / (1024 * 1024);
      sizeFormatted = sizeMB >= 1000 ? `${(sizeMB / 1024).toFixed(1)} GB` : `${Math.round(sizeMB)} MB`;

      setProcessingStage(`Uploading video (${sizeFormatted})...`);

      // Upload directly to server so 24/7 cloud FFmpeg can stream the actual file
      try {
        const uploadResult = await uploadVideoToServer(selectedFile, (percent, loadedBytes, totalBytes) => {
          setUploadProgress(percent);
          const loadedMB = (loadedBytes / (1024 * 1024)).toFixed(1);
          const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
          setProcessingStage(`Uploading: ${loadedMB} MB / ${totalMB} MB (${percent}%)`);
        });

        if (uploadResult.success && uploadResult.videoPath) {
          videoPath = uploadResult.videoPath;
          videoUrl = uploadResult.url || videoUrl;
        } else if (uploadResult.error) {
          throw new Error(uploadResult.error);
        }
      } catch (err: any) {
        console.warn('Server storage warning:', err);
      }

      setProcessingStage('Finalizing and saving to library...');
      setUploadProgress(100);

      // Store in browser local media vault
      const blobUrl = await storeLocalVideoBlob(videoId, selectedFile);
      if (!videoUrl) videoUrl = blobUrl;

      if (filePreviewData) {
        duration = filePreviewData.duration;
        resolution = filePreviewData.resolution;
        thumbnailUrl = filePreviewData.thumbnailUrl;
      }
    } else if (!videoUrl) {
      videoUrl = '/videos/lofi-chill.mp4';
      videoPath = 'public/videos/lofi-chill.mp4';
    }

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
    };

    onAddVideo(newVideo);
    setIsProcessing(false);
    setShowUploadModal(false);
    setSelectedFile(null);
    setFilePreviewData(null);
    setCustomTitle('');
    setCustomUrl('');

    setSuccessToast(`"${newVideo.title}" was uploaded and added to your 24/7 video library!`);
    setTimeout(() => setSuccessToast(null), 4000);
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

      {/* Title & Storage Bar matching Screenshot 4 */}
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

        {/* Storage Bar Indicator */}
        <div className="flex flex-col gap-1.5 w-full md:w-80">
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
              className="h-full bg-[#6320ee] rounded-full transition-all duration-300"
              style={{ width: `${storagePercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>{availableGB} GB available</span>
            <span>Max file: 2 GB</span>
          </div>
        </div>
      </div>

      {/* Main Content: Empty State or Video Grid */}
      {videos.length === 0 ? (
        /* Empty State matching Screenshot 4 */
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
            {videos.map((video) => (
              <div
                key={video.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs group flex flex-col justify-between"
              >
                <div className="relative aspect-video bg-black overflow-hidden">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => setPreviewVideo(video)}
                      className="w-12 h-12 rounded-full bg-white/90 text-[#6320ee] flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    </button>
                  </div>
                  <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-xs text-xs font-mono text-white px-2 py-0.5 rounded">
                    {video.duration}
                  </span>
                </div>

                <div className="p-4 flex flex-col gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {video.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{video.resolution}</span>
                    <span>·</span>
                    <span>{video.sizeFormatted}</span>
                    <span>·</span>
                    <span>{video.createdAt}</span>
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
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      title="Delete Video"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Video Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
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
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileChange(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#6320ee] bg-purple-50 dark:bg-purple-950/40 scale-[1.01]'
                      : selectedFile
                      ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-[#6320ee]'
                  }`}
                >
                  {selectedFile ? (
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

                {/* Progress bar if analyzing or uploading */}
                {isProcessing && (
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 shadow-xs animate-in fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#6320ee] dark:text-[#a855f7] flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>{processingStage}</span>
                      </span>
                      <span className="font-mono font-bold text-[#6320ee] dark:text-[#a855f7] shrink-0 ml-2">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-purple-200/70 dark:bg-purple-900/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#6320ee] rounded-full transition-all duration-150 ease-out"
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
                      setShowUploadModal(false);
                      setSelectedFile(null);
                      setFilePreviewData(null);
                    }}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing || (!selectedFile && !customTitle.trim())}
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#6320ee] hover:bg-[#5218cc] disabled:opacity-50 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
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
