import React, { useState, useRef, useEffect } from 'react';
import {
  UserPlus,
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  ArrowRight,
  CheckCircle2,
  Youtube,
  Twitter,
  Instagram,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  LogOut,
  Radio,
  Menu,
  X,
  LayoutDashboard,
} from 'lucide-react';
import { PantherLogo } from './PantherLogo';
import { BILLING_PLANS } from '../config/billingPlans';
import { UserProfile, BillingPeriod, SubscriptionPlanItem, SiteMetaSettings } from '../types';
import { getYouTubeVideoId, fetchPublicSettings } from '../lib/api';

interface LandingPageViewProps {
  onGoToDashboard: () => void;
  onGoToSlots?: (preferredPlan?: BillingPeriod) => void;
  onOpenContact: () => void;
  onOpenAuth?: (mode?: 'login' | 'register') => void;
  isAuthenticated?: boolean;
  user?: UserProfile;
  onLogout?: () => void;
  plans?: SubscriptionPlanItem[];
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onGoToDashboard,
  onGoToSlots,
  onOpenContact,
  onOpenAuth,
  isAuthenticated,
  user,
  onLogout,
  plans,
}) => {
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [isMutedDemo, setIsMutedDemo] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<SiteMetaSettings | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(99);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPublicSettings()
      .then((s) => {
        if (s) setSettings(s);
      })
      .catch(console.error);

    const handleUpdate = () => {
      fetchPublicSettings()
        .then((s) => {
          if (s) setSettings(s);
        })
        .catch(console.error);
    };

    window.addEventListener('streamadda_settings_updated', handleUpdate);
    return () => {
      window.removeEventListener('streamadda_settings_updated', handleUpdate);
    };
  }, []);

  const videoUrl = settings?.home_live_video_url || 'https://www.youtube.com/watch?v=7PIji8OubXU';
  const videoTitle = settings?.home_live_video_title || 'How To Setup Youtube 24x7 Livestream';
  const videoSubtitle = settings?.home_live_video_subtitle || 'Stream LIVE';
  const liveBadgeText = settings?.home_live_video_badge || 'LIVE 1.5K VIEWERS';
  const youtubeId = getYouTubeVideoId(videoUrl);
  const customPoster = settings?.home_live_video_poster?.trim();
  const posterUrl = customPoster
    ? customPoster
    : youtubeId
    ? `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`
    : '/assets/home-live-mockup.jpg';

  const handleScrollTo = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `#${id}`);
    }
  };

  const handleOpenSlots = (plan?: BillingPeriod) => {
    setIsMobileMenuOpen(false);
    if (onGoToSlots) {
      onGoToSlots(plan);
    } else {
      onGoToDashboard();
    }
  };

  const togglePlay = () => {
    if (youtubeId) {
      setIsPlayingDemo(!isPlayingDemo);
      return;
    }
    if (videoRef.current) {
      if (isPlayingDemo) {
        videoRef.current.pause();
        setIsPlayingDemo(false);
      } else {
        videoRef.current.play().catch(console.error);
        setIsPlayingDemo(true);
      }
    } else {
      setIsPlayingDemo(!isPlayingDemo);
    }
  };

  const toggleMute = () => {
    setIsMutedDemo(!isMutedDemo);
    if (videoRef.current) {
      videoRef.current.muted = !isMutedDemo;
    }
  };

  const handleOpenYouTube = () => {
    if (youtubeId) {
      window.open(`https://www.youtube.com/watch?v=${youtubeId}`, '_blank');
    } else if (videoUrl && videoUrl.trim()) {
      window.open(videoUrl, '_blank');
    } else {
      window.open('https://www.youtube.com', '_blank');
    }
  };

  const handleToggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const faqs = [
    {
      q: 'Do I need to keep my computer or phone turned on while streaming?',
      a: 'No! Stream LIVE runs 100% in our cloud servers. Once you click "Start Stream", our high-speed cloud nodes handle the RTMP broadcast continuously 24 hours a day, 7 days a week, even if your device is turned off or offline.',
    },
    {
      q: 'Does Stream LIVE require my YouTube password or Google login?',
      a: 'Never! We strictly use the standard RTMP stream key method. You only paste your YouTube Live Stream Key, which guarantees 100% security for your channel.',
    },
    {
      q: 'Can my video loop infinitely?',
      a: 'Yes! With our "Stream Loop" feature enabled, your video will seamlessly restart and loop continuously with zero delay or downtime until you decide to stop it or reach your end schedule.',
    },
    {
      q: 'What resolution and bitrate does Stream LIVE support?',
      a: 'Stream LIVE streams in crystal-clear Full HD 1080p at 60fps with up to 6000 kbps bitrates, ensuring your stream is recommended across YouTube browse features and suggested videos.',
    },
    {
      q: 'Which streaming platforms are supported?',
      a: 'We support YouTube Live, Facebook Live, Twitch, and custom RTMP ingest URLs (Kick, LinkedIn Live, Twitter/X Spaces, etc.).',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-[#6320ee]/30 selection:text-white">
      {/* Top Navbar matching Screenshot 7 */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 px-6 sm:px-12 py-3.5 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <div className="flex items-center">
          <PantherLogo size={36} />
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <button
            type="button"
            onClick={(e) => handleScrollTo(e, 'home')}
            className="text-[#6320ee] dark:text-[#a855f7] border-b-2 border-[#6320ee] pb-0.5 cursor-pointer"
          >
            Home
          </button>
          <button
            type="button"
            onClick={(e) => handleScrollTo(e, 'how-it-works')}
            className="hover:text-[#6320ee] dark:hover:text-[#a855f7] transition-colors cursor-pointer"
          >
            How it Works
          </button>
          <button
            type="button"
            onClick={(e) => handleScrollTo(e, 'pricing')}
            className="hover:text-[#6320ee] dark:hover:text-[#a855f7] transition-colors cursor-pointer"
          >
            Pricing
          </button>
          <button
            type="button"
            onClick={(e) => handleScrollTo(e, 'faq')}
            className="hover:text-[#6320ee] dark:hover:text-[#a855f7] transition-colors cursor-pointer"
          >
            FAQ
          </button>
          <button
            type="button"
            onClick={onOpenContact}
            className="hover:text-[#6320ee] dark:hover:text-[#a855f7] transition-colors cursor-pointer"
          >
            Contact Us
          </button>

          {/* Quick Direct Link to Live Slots */}
          <button
            type="button"
            onClick={() => handleOpenSlots()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[#6320ee] dark:text-[#a855f7] bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors cursor-pointer shadow-2xs"
          >
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span>Live Slots</span>
          </button>
        </nav>

        {/* Right: Auth / User CTA & Social Icons */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onGoToDashboard}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#6320ee] hover:bg-[#5218cc] text-white shadow-xs transition-all cursor-pointer text-left"
                title="Go to App Dashboard"
              >
                <div className="w-6 h-6 rounded-full bg-white/20 text-white font-bold text-xs flex items-center justify-center">
                  {user.avatarInitials || (user.name ? user.name.charAt(0) : 'U')}
                </div>
                <span className="text-xs font-bold">
                  Dashboard
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleOpenSlots()}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="Go directly to Live Slots"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Slots</span>
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Log out of account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )}
            </div>
          ) : (
            onOpenAuth && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-[#6320ee] dark:hover:text-[#a855f7] px-2.5 py-1.5 cursor-pointer transition-colors"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] shadow-xs transition-all cursor-pointer"
                >
                  Register
                </button>
              </div>
            )
          )}

          <div className="hidden lg:flex items-center gap-3 text-slate-600 dark:text-slate-400 ml-1">
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:text-red-600 transition-colors">
              <Youtube className="w-5 h-5" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-sky-500 transition-colors">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-pink-600 transition-colors">
              <Instagram className="w-4 h-4" />
            </a>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden sticky top-[65px] z-30 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col gap-2.5 shadow-xl animate-in slide-in-from-top-2 duration-150">
          <button
            type="button"
            onClick={(e) => handleScrollTo(e, 'home')}
            className="text-left py-2 font-semibold text-slate-800 dark:text-slate-200 hover:text-[#6320ee]"
          >
            Home
          </button>
          <button
            type="button"
            onClick={(e) => handleScrollTo(e, 'how-it-works')}
            className="text-left py-2 font-semibold text-slate-800 dark:text-slate-200 hover:text-[#6320ee]"
          >
            How it Works
          </button>
          <button
            type="button"
            onClick={(e) => handleScrollTo(e, 'pricing')}
            className="text-left py-2 font-semibold text-slate-800 dark:text-slate-200 hover:text-[#6320ee]"
          >
            Pricing Plans
          </button>
          <button
            type="button"
            onClick={(e) => handleScrollTo(e, 'faq')}
            className="text-left py-2 font-semibold text-slate-800 dark:text-slate-200 hover:text-[#6320ee]"
          >
            Frequently Asked Questions
          </button>
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              onOpenContact();
            }}
            className="text-left py-2 font-semibold text-slate-800 dark:text-slate-200 hover:text-[#6320ee]"
          >
            Contact Support
          </button>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleOpenSlots()}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-[#6320ee] hover:bg-[#5218cc] flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Radio className="w-4 h-4 text-red-400 animate-pulse" />
              <span>Go to Live Slots</span>
            </button>
          </div>
        </div>
      )}

      {/* Hero Section matching Screenshot 7 */}
      <section
        id="home"
        className="relative overflow-hidden bg-gradient-to-br from-[#682ae9] via-[#591cc5] to-[#45109b] text-white px-6 sm:px-12 lg:px-20 py-20 lg:py-28"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column matching screenshot 7 */}
          <div className="lg:col-span-7 flex flex-col items-start gap-6">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-none text-white text-balance">
              Stream <span className="text-red-500">LIVE</span>
            </h1>

            <p className="text-xl sm:text-2xl font-medium text-purple-100 max-w-xl leading-snug">
              Stream your Pre-Recorded videos 24x7 & grow your channel with automated, unlimited live streaming
            </p>

            <div className="flex flex-col gap-2 text-base text-purple-200 font-normal">
              <p>Unlock the new Technique of Growing Subscribers & Earn More Revenue.</p>
              <p>No studio, no webcam — just upload and go live.</p>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenSlots()}
                className="px-8 py-4 rounded-full text-base font-bold text-[#5b21b6] bg-white hover:bg-purple-50 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2.5"
              >
                <Radio className="w-5 h-5 text-red-600 animate-pulse" />
                <span>{isAuthenticated ? 'Go to Live Slots' : 'Start Live Streaming Now'}</span>
              </button>
            </div>
          </div>

          {/* Right Column matching screenshot 7 */}
          <div className="lg:col-span-5 flex flex-col items-center text-center gap-8">
            <span className="text-sm font-medium text-purple-200 italic">
              *We don't need any access to your channel or account!
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white max-w-md">
              24x7 NonStop YouTube Live Stream Service
            </h2>

            {/* 3 Steps in Circles matching Screenshot 7 */}
            <div className="flex items-start justify-center gap-6 sm:gap-8 w-full">
              {/* Step 1 */}
              <button
                type="button"
                onClick={() => (isAuthenticated ? handleOpenSlots() : onOpenAuth ? onOpenAuth('register') : handleOpenSlots())}
                className="flex flex-col items-center gap-3 max-w-[110px] text-center cursor-pointer group hover:scale-105 transition-transform"
              >
                <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white shadow-inner group-hover:bg-white/25 transition-colors">
                  <UserPlus className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-xs font-bold text-white leading-tight">Create Account</h4>
                  <p className="text-[11px] text-purple-200 leading-tight">Create Account & Choose Plan</p>
                </div>
              </button>

              {/* Step 2 */}
              <button
                type="button"
                onClick={() => handleOpenSlots()}
                className="flex flex-col items-center gap-3 max-w-[110px] text-center cursor-pointer group hover:scale-105 transition-transform"
              >
                <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white shadow-inner group-hover:bg-white/25 transition-colors">
                  <Upload className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-xs font-bold text-white leading-tight">Upload Videos</h4>
                  <p className="text-[11px] text-purple-200 leading-tight">Upload Pre-Recorded Videos in Gallery</p>
                </div>
              </button>

              {/* Step 3 */}
              <button
                type="button"
                onClick={() => handleOpenSlots()}
                className="flex flex-col items-center gap-3 max-w-[110px] text-center cursor-pointer group hover:scale-105 transition-transform"
              >
                <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white shadow-inner group-hover:bg-white/25 transition-colors">
                  <Play className="w-7 h-7 fill-current ml-0.5" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-xs font-bold text-white leading-tight">Start Streaming</h4>
                  <p className="text-[11px] text-purple-200 leading-tight">Just Click To Start Stream</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How does Stream LIVE work? Section matching Screenshot 8 */}
      <section id="how-it-works" className="px-6 sm:px-12 lg:px-20 py-20 bg-slate-50/60 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          {/* Section Heading */}
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              How does <span className="text-[#6320ee] dark:text-[#a855f7]">Stream <span className="text-red-600">LIVE</span></span> work?
            </h2>
          </div>

          {/* Big Purple Card Container matching Screenshot 8 */}
          <div className="bg-[#591cc5] text-white rounded-3xl p-8 sm:p-12 lg:p-14 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Steps */}
            <div className="lg:col-span-5 flex flex-col gap-8">
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                See How It Works
              </h3>

              <div className="flex flex-col gap-6">
                <div>
                  <h4 className="text-lg font-bold text-white mb-1.5">
                    Launch
                  </h4>
                  <p className="text-sm text-purple-100 leading-relaxed">
                    Launch your branded live video on your channel in just a few simple steps, using our easy-to-use video uploading dashboard. No coding required.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-white mb-1.5">
                    Grow
                  </h4>
                  <p className="text-sm text-purple-100 leading-relaxed">
                    Unlock the true potential of your videos with Stream LIVE and our automatic loop video streaming system. Use our easy and user-friendly video upload features to supercharge your reach.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-white mb-1.5">
                    Earn More
                  </h4>
                  <p className="text-sm text-purple-100 leading-relaxed">
                    Join Stream LIVE and stay ahead of the social media streaming game. Get help from our expert to build a stable, sustainable & scalable business.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Video Player Mockup matching Screenshot */}
            <div className="lg:col-span-7">
              <div
                ref={playerContainerRef}
                className="bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-black/40 relative group aspect-video flex items-center justify-center"
              >
                {isPlayingDemo && youtubeId ? (
                  <div className="relative w-full h-full bg-black">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=${isMutedDemo ? 1 : 0}&playsinline=1&rel=0&controls=1`}
                      title={videoTitle}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full object-cover border-0"
                    />
                    {/* Floating bar to close / exit player back to mockup */}
                    <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPlayingDemo(false)}
                        className="px-3 py-1.5 bg-black/80 hover:bg-black text-white text-xs font-semibold rounded-lg backdrop-blur-xs border border-white/20 shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Exit player back to preview"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Exit Player</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenYouTube}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Watch on YouTube"
                      >
                        <Youtube className="w-3.5 h-3.5" />
                        <span>Watch on YouTube</span>
                      </button>
                    </div>
                  </div>
                ) : isPlayingDemo && !youtubeId ? (
                  <div className="relative w-full h-full bg-black">
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      autoPlay
                      loop
                      muted={isMutedDemo}
                      playsInline
                      onTimeUpdate={(e) => {
                        const cur = e.currentTarget.currentTime;
                        const dur = e.currentTarget.duration || 99;
                        setVideoCurrentTime(cur);
                        setVideoDuration(dur);
                      }}
                      className="w-full h-full object-cover"
                      poster={posterUrl}
                    />
                    <div className="absolute top-3 left-3 z-30">
                      <button
                        type="button"
                        onClick={() => setIsPlayingDemo(false)}
                        className="px-3 py-1.5 bg-black/80 hover:bg-black text-white text-xs font-semibold rounded-lg backdrop-blur-xs border border-white/20 shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Exit Player</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Background Poster Image */}
                    <img
                      src={posterUrl}
                      alt={videoTitle}
                      className="w-full h-full object-cover select-none"
                      onError={(e) => {
                        const src = e.currentTarget.src;
                        if (youtubeId && src.includes('maxresdefault')) {
                          e.currentTarget.src = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
                        } else if (!src.includes('home-live-mockup.jpg')) {
                          e.currentTarget.src = '/assets/home-live-mockup.jpg';
                        }
                      }}
                    />

                    {/* TOP OVERLAY HEADER - Matching user's picture */}
                    <div className="absolute top-0 left-0 right-0 z-20 p-3.5 sm:p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between text-white pointer-events-auto">
                      <div className="flex items-center gap-2.5">
                        {/* Red Live Badge */}
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-600 flex flex-col items-center justify-center text-white shrink-0 shadow-md border border-white/20">
                          <Play className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-current ml-0.5" />
                          <span className="text-[6px] sm:text-[7px] font-black tracking-tight leading-none mt-0.5">LIVE</span>
                        </div>
                        <div className="flex flex-col">
                          <span
                            onClick={handleOpenYouTube}
                            className="text-xs sm:text-sm font-bold leading-tight truncate max-w-[190px] sm:max-w-md cursor-pointer hover:underline"
                            title="Open live stream on YouTube"
                          >
                            {videoTitle}
                          </span>
                          <span className="text-[10px] sm:text-xs text-slate-300 font-medium">
                            {videoSubtitle}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {/* Red Pill: LIVE 1.5K VIEWERS */}
                        <span className="bg-red-600 text-white text-[10px] sm:text-xs font-black px-2.5 sm:px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md tracking-wider">
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white animate-pulse" />
                          <span>{liveBadgeText}</span>
                        </span>
                        {/* Mute Button */}
                        <button
                          type="button"
                          onClick={toggleMute}
                          className="p-1.5 rounded-lg text-white hover:text-purple-300 transition-colors cursor-pointer"
                          title={isMutedDemo ? 'Unmute' : 'Mute'}
                        >
                          {isMutedDemo ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* CENTER BUTTON - Glowing Electric Blue/Sky Blue Ring with Pause/Play Icon */}
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="absolute z-20 w-18 h-18 sm:w-22 sm:h-22 rounded-full bg-black/65 backdrop-blur-xs text-white border-[3px] border-[#38bdf8] ring-4 ring-[#38bdf8]/35 shadow-[0_0_35px_rgba(56,189,248,0.9)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer group"
                      title="Play / Pause Live Stream"
                    >
                      <div className="flex items-center gap-1.5 group-hover:scale-105 transition-transform">
                        <span className="w-2 sm:w-2.5 h-7 sm:h-8 bg-white rounded-xs shadow-xs" />
                        <span className="w-2 sm:w-2.5 h-7 sm:h-8 bg-white rounded-xs shadow-xs" />
                      </div>
                    </button>

                    {/* BOTTOM OVERLAY BAR - Matching user's picture */}
                    <div className="absolute bottom-0 left-0 right-0 z-20 px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-t from-black/95 via-black/65 to-transparent flex items-center justify-between text-white select-none">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={togglePlay}
                          className="hover:opacity-80 cursor-pointer transition-opacity flex items-center"
                          title="Play / Pause Live Stream"
                        >
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-4 bg-white rounded-2xs shadow-xs" />
                            <span className="w-1.5 h-4 bg-white rounded-2xs shadow-xs" />
                          </div>
                        </button>
                        <span className="font-sans text-xs sm:text-sm font-medium text-slate-200 tracking-wide">
                          0:01 / 1:39
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={handleOpenYouTube}
                          className="flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer group"
                          title="Open and Watch on YouTube"
                        >
                          <div className="w-6 h-4 bg-red-600 rounded flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                            <Play className="w-2 h-2 fill-white text-white ml-0.5" />
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-white tracking-tight">YouTube</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleToggleFullscreen}
                          className="text-slate-300 hover:text-white cursor-pointer transition-colors p-1"
                          title="Toggle Fullscreen"
                        >
                          <Maximize className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section matching Billing Plans */}
      <section id="pricing" className="px-6 sm:px-12 lg:px-20 py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col gap-12 items-center">
          <div className="text-center max-w-2xl flex flex-col gap-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Simple, Transparent Pricing
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pick the slot duration that fits your channel growth goals. Cancel or renew anytime.
            </p>

            {/* Currency Switcher */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  onClick={() => setCurrency('INR')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    currency === 'INR' ? 'bg-white dark:bg-slate-900 text-[#6320ee] shadow-xs' : 'text-slate-500'
                  }`}
                >
                  ₹ INR (Rupees)
                </button>
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    currency === 'USD' ? 'bg-white dark:bg-slate-900 text-[#6320ee] shadow-xs' : 'text-slate-500'
                  }`}
                >
                  $ USD (Dollars)
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Pricing Cards Grid */}
          {(() => {
            const activePlans: SubscriptionPlanItem[] = (plans && plans.length > 0)
              ? plans.filter((p) => p.isActive)
              : [
                  { id: 'plan_days', title: 'Daily Trial / Event', period: 'Days', durationLabel: '1 Day', durationDays: 1, priceINR: 99, priceUSD: 1.5, storageGB: 1, maxSlots: 1, features: ['24 Hours nonstop live streaming', '1GB Cloud video storage', 'Perfect for one-off broadcasts or webinars'], isActive: true, isPopular: false, displayOrder: 1 },
                  { id: 'plan_weeks', title: 'Weekly Boost', period: 'Weeks', durationLabel: '1 Week', durationDays: 7, priceINR: 299, priceUSD: 4, storageGB: 2, maxSlots: 1, features: ['24/7 Continuous streaming for 7 days', '2GB Cloud video storage', 'Instant activation upon order', 'All platforms supported'], isActive: true, isPopular: false, displayOrder: 2 },
                  { id: 'plan_months', title: 'Monthly Standard', period: 'Months', durationLabel: '1 Month', durationDays: 30, priceINR: 799, priceUSD: 10, storageGB: 4, maxSlots: 1, features: ['24/7 Non-stop continuous loop streaming', '4GB Cloud video storage per slot', 'Full 1080p 60fps broadcast quality', 'Automated schedule & loop timer', 'Standard support'], isActive: true, isPopular: false, displayOrder: 3 },
                  { id: 'plan_3months', title: 'Quarterly Supercharged', period: '3 Months', durationLabel: '3 Months', durationDays: 90, priceINR: 1999, priceUSD: 24, storageGB: 4, maxSlots: 1, features: ['24/7 Non-stop continuous loop streaming', '4GB Cloud video storage per slot', 'Zero computer or phone usage required', 'YouTube, Facebook, Twitch & Custom RTMP', 'Ultra-fast dedicated streaming server', 'Priority WhatsApp & ticket support'], isActive: true, isPopular: true, displayOrder: 4 },
                ];

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                {activePlans.map((plan) => {
                  const isPopular = plan.isPopular || plan.period === '3 Months';
                  const price = currency === 'INR' ? `₹${plan.priceINR}` : `$${plan.priceUSD}`;

                  return (
                    <div
                      key={plan.id || plan.period}
                      className={`rounded-2xl p-6 flex flex-col justify-between border transition-all duration-200 ${
                        isPopular
                          ? 'border-[#6320ee] bg-purple-50/30 dark:bg-purple-950/20 shadow-lg ring-2 ring-[#6320ee]/30 relative'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300'
                      }`}
                    >
                      {isPopular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#6320ee] text-white text-[10px] font-extrabold uppercase tracking-wider py-1 px-3 rounded-full shadow-xs">
                          {plan.badgeText || 'Best Value · Save 30%'}
                        </span>
                      )}

                      <div className="flex flex-col gap-4">
                        <div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-white">
                            {plan.title}
                          </h4>
                          <span className="text-xs text-slate-400 font-medium">
                            {plan.durationLabel || `${plan.durationDays} Days`} Access
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                            {price}
                          </span>
                          <span className="text-xs text-slate-400">/{plan.durationLabel || `${plan.durationDays} Days`}</span>
                        </div>

                        <div className="text-xs font-semibold text-[#6320ee] dark:text-[#a855f7] bg-purple-50 dark:bg-purple-950/40 p-2 rounded-lg">
                          *{plan.storageGB || 10}GB Cloud Video Storage
                        </div>

                        <ul className="flex flex-col gap-2 pt-2 text-xs text-slate-600 dark:text-slate-300">
                          {(plan.features && plan.features.length > 0 ? plan.features : ['24/7 Continuous Loop Streaming', `${plan.storageGB || 10}GB Cloud Storage`, 'Full 1080p 60fps Broadcast Quality']).map((feat, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-6">
                        <button
                          type="button"
                          onClick={() => handleOpenSlots(plan.period as BillingPeriod)}
                          className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isPopular
                              ? 'bg-[#6320ee] text-white hover:bg-[#5218cc] shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isAuthenticated ? `Select ${plan.title}` : `Choose ${plan.durationLabel || plan.period} Plan`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="px-6 sm:px-12 lg:px-20 py-20 bg-slate-50/60 dark:bg-slate-900/40">
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Everything you need to know about 24/7 cloud live streaming with Stream LIVE.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left font-semibold text-slate-900 dark:text-white text-sm flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer matching Screenshot 8 */}
      <footer className="bg-[#591cc5] text-white px-6 sm:px-12 lg:px-20 py-16 border-t border-purple-700/50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Col 1: Brand & Description */}
          <div className="md:col-span-6 flex flex-col gap-4">
            <img src="/logo.png" alt="Stream LIVE" className="h-10 object-contain w-fit" />
            <p className="text-sm text-purple-100 max-w-md leading-relaxed">
              The Best Professional Pre-Recorded Video Live Streaming Platform. Stream your Pre-Recorded videos 24x7 & get more Suggested and Browse feature video views.
            </p>
            <div className="flex items-center gap-4 text-purple-200 mt-2">
              <Youtube className="w-5 h-5 hover:text-white cursor-pointer" />
              <Twitter className="w-5 h-5 hover:text-white cursor-pointer" />
              <Instagram className="w-5 h-5 hover:text-white cursor-pointer" />
            </div>
          </div>

          {/* Col 2: Features */}
          <div className="md:col-span-3 flex flex-col gap-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-purple-200">
              Features
            </h4>
            <div className="flex flex-col gap-2 text-xs text-purple-100">
              <button type="button" onClick={(e) => handleScrollTo(e, 'home')} className="text-left hover:text-white cursor-pointer">Home</button>
              <button type="button" onClick={(e) => handleScrollTo(e, 'how-it-works')} className="text-left hover:text-white cursor-pointer">How it Works</button>
              <button type="button" onClick={(e) => handleScrollTo(e, 'pricing')} className="text-left hover:text-white cursor-pointer">Pricing</button>
              <button type="button" onClick={() => handleOpenSlots()} className="text-left hover:text-white cursor-pointer font-bold text-amber-300">Live Slots</button>
              <button type="button" onClick={onGoToDashboard} className="text-left hover:text-white cursor-pointer">Cloud Video Storage</button>
            </div>
          </div>

          {/* Col 3: Legal */}
          <div className="md:col-span-3 flex flex-col gap-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-purple-200">
              Legal
            </h4>
            <div className="flex flex-col gap-2 text-xs text-purple-100">
              <a href="#privacy" className="hover:text-white">Privacy Policy</a>
              <a href="#terms" className="hover:text-white">Terms of Service</a>
              <a href="#refund" className="hover:text-white">Refund Policy</a>
              <button onClick={onOpenContact} className="text-left hover:text-white cursor-pointer">Support Center</button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-10 mt-10 border-t border-purple-400/20 text-xs text-purple-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Stream LIVE. All rights reserved.</p>
          <p>Continuous 24x7 RTMP Cloud Video Streaming for Creators.</p>
        </div>
      </footer>
    </div>
  );
};
