/**
 * StreamAdda 24/7 Cloud RTMP Streaming Service
 * Directly interacts with backend FFmpeg encoder process
 */

export interface StreamTelemetry {
  isRunning: boolean;
  status: 'starting' | 'live' | 'error' | 'stopped' | 'off';
  startedAt?: number;
  uptimeSeconds?: number;
  logs: string[];
  stats?: {
    fps?: number;
    bitrate?: string;
    frames?: number;
    speed?: string;
    time?: string;
  } | null;
  lastError?: string | null;
}

export interface HandshakeResult {
  valid: boolean;
  message: string;
  details?: string;
}

export async function startCloudStream(params: {
  slotId: string;
  streamKey: string;
  platform: string;
  customRtmpUrl?: string;
  videoPath?: string;
  targetBitrateKbps?: number;
  fps?: number;
  audioBitrateKbps?: number;
}): Promise<{ success: boolean; pid?: number; rtmpTarget?: string; error?: string }> {
  try {
    const res = await fetch('/api/stream/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to start cloud streaming process');
    }
    return data;
  } catch (err: any) {
    console.error('Error starting cloud stream:', err);
    return { success: false, error: err.message || 'Network error starting stream' };
  }
}

export async function stopCloudStream(slotId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch('/api/stream/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId }),
    });
    return await res.json();
  } catch (err) {
    console.error('Error stopping cloud stream:', err);
    return { success: false };
  }
}

export async function fetchStreamStatus(slotId: string): Promise<StreamTelemetry> {
  try {
    const res = await fetch(`/api/stream/status/${encodeURIComponent(slotId)}`);
    if (!res.ok) throw new Error('Status failed');
    return await res.json();
  } catch {
    return {
      isRunning: false,
      status: 'off',
      logs: [],
      stats: null,
      lastError: null,
    };
  }
}

export async function testStreamKeyHandshake(
  streamKey: string,
  platform = 'YouTube',
  customRtmpUrl?: string
): Promise<HandshakeResult> {
  try {
    const res = await fetch('/api/stream/test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamKey, platform, customRtmpUrl }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      valid: false,
      message: 'Failed to contact encoder service',
      details: err.message,
    };
  }
}

export async function uploadVideoToServer(
  file: File,
  onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void
): Promise<{
  success: boolean;
  url?: string;
  videoPath?: string;
  size?: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/videos/upload');

      const token = localStorage.getItem('streamadda_auth_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) {
            const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
            onProgress(percent, e.loaded, e.total);
          }
        };
      }

      xhr.onload = () => {
        try {
          const contentType = xhr.getResponseHeader('content-type') || '';
          if (!contentType.includes('application/json')) {
            const cleanSnippet = (xhr.responseText || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 150);
            resolve({ success: false, error: cleanSnippet || `Server returned HTTP ${xhr.status}` });
            return;
          }
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            if (onProgress) onProgress(100, file.size, file.size);
            resolve(data);
          } else {
            resolve({ success: false, error: data.error || 'Video upload failed' });
          }
        } catch (err: any) {
          resolve({ success: false, error: err.message || 'Failed to parse server response' });
        }
      };

      xhr.onerror = () => {
        resolve({ success: false, error: 'Network error occurred during video upload' });
      };

      const formData = new FormData();
      formData.append('video', file);
      xhr.send(formData);
    } catch (err: any) {
      console.error('Server video upload error:', err);
      resolve({ success: false, error: err.message });
    }
  });
}
