import { VideoItem } from '../types';

export const PRESET_SAMPLE_VIDEOS: VideoItem[] = [
  {
    id: 'vid-lofi-01',
    title: '24/7 Lo-Fi Chill Beats & Relaxing Study Stream',
    duration: '45:30',
    sizeBytes: 524288000,
    sizeFormatted: '500 MB',
    resolution: '1080p 60fps',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60',
    videoUrl: '/videos/lofi-chill.mp4',
    videoPath: 'public/videos/lofi-chill.mp4',
    createdAt: '28 Oct 2026',
    category: 'Music & Lo-Fi',
  },
  {
    id: 'vid-nature-02',
    title: 'Ultra 4K Relaxing Nature Waterfalls & Forest Sounds',
    duration: '1:15:00',
    sizeBytes: 850000000,
    sizeFormatted: '850 MB',
    resolution: '1080p 60fps',
    thumbnailUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=60',
    videoUrl: '/videos/nature-relax.mp4',
    videoPath: 'public/videos/nature-relax.mp4',
    createdAt: '25 Oct 2026',
    category: 'Relaxation & Nature',
  },
  {
    id: 'vid-tech-03',
    title: 'Full Stack App Development Masterclass Replay',
    duration: '58:20',
    sizeBytes: 680000000,
    sizeFormatted: '680 MB',
    resolution: '1080p 60fps',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60',
    videoUrl: '/videos/tech-masterclass.mp4',
    videoPath: 'public/videos/tech-masterclass.mp4',
    createdAt: '22 Oct 2026',
    category: 'Coding & Tech',
  },
];

