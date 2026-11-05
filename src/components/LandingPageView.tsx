import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { PantherLogo } from './PantherLogo';
import { BILLING_PLANS } from '../config/billingPlans';
import { UserProfile } from '../types';

interface LandingPageViewProps {
  onGoToDashboard: () => void;
  onOpenContact: () => void;
  onOpenAuth?: (mode?: 'login' | 'register') => void;
  isAuthenticated?: boolean;
  user?: UserProfile;
  onLogout?: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onGoToDashboard,
  onOpenContact,
  onOpenAuth,
  isAuthenticated,
  user,
  onLogout,
}) => {
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [isMutedDemo, setIsMutedDemo] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlayingDemo) {
        videoRef.current.pause();
        setIsPlayingDemo(false);
      } else {
        videoRef.current.play();
        setIsPlayingDemo(true);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMutedDemo;
      setIsMutedDemo(!isMutedDemo);
    }
  };

  const faqs = [
    {
      q: 'Do I need to keep my computer or phone turned on while streaming?',
      a: 'No! StreamAdda runs 100% in our cloud servers. Once you click "Start Stream", our high-speed cloud nodes handle the RTMP broadcast continuously 24 hours a day, 7 days a week, even if your device is turned off or offline.',
    },
    {
      q: 'Does StreamAdda require my YouTube password or Google login?',
      a: 'Never! We strictly use the standard RTMP stream key method. You only paste your YouTube Live Stream Key, which guarantees 100% security for your channel.',
    },
    {
      q: 'Can my video loop infinitely?',
      a: 'Yes! With our "Stream Loop" feature enabled, your video will seamlessly restart and loop continuously with zero delay or downtime until you decide to stop it or reach your end schedule.',
    },
    {
      q: 'What resolution and bitrate does StreamAdda support?',
      a: 'StreamAdda streams in crystal-clear Full HD 1080p at 60fps with up to 6000 kbps bitrates, ensuring your stream is recommended across YouTube browse features and suggested videos.',
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
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <a href="#home" className="text-[#6320ee] dark:text-[#a855f7] border-b-2 border-[#6320ee] pb-0.5">
            Home
          </a>
          <a href="#how-it-works" className="hover:text-[#6320ee] dark:hover:text-[#a855f7] transition-colors">
            How it Works
          </a>
          <a href="#pricing" className="hover:text-[#6320ee] dark:hover:text-[#a855f7] transition-colors">
            Pricing
          </a>
          <a href="#faq" className="hover:text-[#6320ee] dark:hover:text-[#a855f7] transition-colors">
            FAQ
          </a>
          <button
            onClick={onOpenContact}
            className="hover:text-[#6320ee] dark:hover:text-[#a855f7] transition-colors cursor-pointer"
          >
            Contact Us
          </button>
        </nav>

        {/* Right: Auth / User CTA & Social Icons */}
        <div className="flex items-center gap-3 sm:gap-5">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5">
              <button
                onClick={onGoToDashboard}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                title="Go to App Console"
              >
                <div className="w-8 h-8 rounded-full bg-[#004b87] text-white font-semibold text-xs flex items-center justify-center ring-2 ring-[#6320ee]/30 shadow-xs">
                  {user.avatarInitials || (user.name ? user.name.charAt(0) : 'U')}
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {user.name ? user.name.split(' ')[0] : 'User'}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {user.role || 'user'}
                  </span>
                </div>
              </button>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Log out of account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              )}
            </div>
          ) : (
            onOpenAuth && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-[#6320ee] dark:hover:text-[#a855f7] px-2.5 py-1.5 cursor-pointer transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] shadow-xs transition-all cursor-pointer"
                >
                  Register
                </button>
              </div>
            )
          )}

          <div className="hidden sm:flex items-center gap-3 text-slate-600 dark:text-slate-400">
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
        </div>
      </header>

      {/* Hero Section matching Screenshot 7 */}
      <section
        id="home"
        className="relative overflow-hidden bg-gradient-to-br from-[#682ae9] via-[#591cc5] to-[#45109b] text-white px-6 sm:px-12 lg:px-20 py-20 lg:py-28"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column matching screenshot 7 */}
          <div className="lg:col-span-7 flex flex-col items-start gap-6">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-none text-white text-balance">
              Stream Live
            </h1>

            <p className="text-xl sm:text-2xl font-medium text-purple-100 max-w-xl leading-snug">
              Stream your Pre-Recorded videos 24x7 & grow your channel with automated, unlimited live streaming
            </p>

            <div className="flex flex-col gap-2 text-base text-purple-200 font-normal">
              <p>Unlock the new Technique of Growing Subscribers & Earn More Revenue.</p>
              <p>No studio, no webcam — just upload and go live.</p>
            </div>

            <div className="pt-4">
              <button
                onClick={() => (onOpenAuth ? onOpenAuth('register') : onGoToDashboard())}
                className="px-8 py-4 rounded-full text-base font-bold text-[#5b21b6] bg-white hover:bg-purple-50 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Get Started Now
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
                onClick={() => (onOpenAuth ? onOpenAuth('register') : onGoToDashboard())}
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
              <div className="flex flex-col items-center gap-3 max-w-[110px]">
                <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white shadow-inner">
                  <Upload className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-xs font-bold text-white leading-tight">Upload Videos</h4>
                  <p className="text-[11px] text-purple-200 leading-tight">Upload Pre-Recorded Videos in Gallery</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center gap-3 max-w-[110px]">
                <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white shadow-inner">
                  <Play className="w-7 h-7 fill-current ml-0.5" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-xs font-bold text-white leading-tight">Start Streaming</h4>
                  <p className="text-[11px] text-purple-200 leading-tight">Just Click To Start Stream</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How does StreamAdda work? Section matching Screenshot 8 */}
      <section id="how-it-works" className="px-6 sm:px-12 lg:px-20 py-20 bg-slate-50/60 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          {/* Section Heading */}
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              How does <span className="text-[#6320ee] dark:text-[#a855f7]">StreamAdda</span> work?
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
                    Unlock the true potential of your videos with StreamAdda and our automatic loop video streaming system. Use our easy and user-friendly video upload features to supercharge your reach.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-white mb-1.5">
                    Earn More
                  </h4>
                  <p className="text-sm text-purple-100 leading-relaxed">
                    Join StreamAdda and stay ahead of the social media streaming game. Get help from our expert to build a stable, sustainable & scalable business.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Video Player Mockup matching Screenshot 8 */}
            <div className="lg:col-span-7">
              <div className="bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-purple-400/30 relative">
                {/* YouTube Video Header */}
                <div className="p-3 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2.5">
                    <PantherLogo size={24} showText={false} />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold leading-tight truncate">
                        How To Setup Youtube 24x7 Livestream
                      </span>
                      <span className="text-[10px] text-slate-300">StreamAdda</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      ● LIVE 1.5K VIEWERS
                    </span>
                    <button onClick={toggleMute} className="text-white hover:text-purple-300">
                      {isMutedDemo ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Video Container */}
                <div className="relative aspect-video bg-black flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                    loop
                    muted={isMutedDemo}
                    playsInline
                    className="w-full h-full object-cover"
                    poster="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80"
                  />

                  {/* Play/Pause Center Button */}
                  <button
                    onClick={togglePlay}
                    className="absolute z-20 w-16 h-16 rounded-full bg-black/60 backdrop-blur-xs text-white border border-white/20 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer shadow-xl"
                  >
                    {isPlayingDemo ? (
                      <Pause className="w-7 h-7 fill-current" />
                    ) : (
                      <Play className="w-7 h-7 fill-current ml-1" />
                    )}
                  </button>
                </div>

                {/* YouTube Bottom Controls Bar */}
                <div className="p-3 bg-slate-900/95 flex items-center justify-between text-white text-xs">
                  <div className="flex items-center gap-3">
                    <button onClick={togglePlay} className="hover:text-purple-400">
                      {isPlayingDemo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <span className="font-mono text-[11px] text-slate-300">
                      0:01 / 1:39
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-red-500 font-bold">
                      <Youtube className="w-4 h-4" />
                      <span className="text-[11px]">YouTube</span>
                    </div>
                    <Maximize className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                  </div>
                </div>
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

          {/* 4 Pricing Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {Object.values(BILLING_PLANS).map((plan) => {
              const isPopular = plan.period === '3 Months';
              const price = currency === 'INR' ? `₹${plan.priceINR}` : `$${plan.priceUSD}`;

              return (
                <div
                  key={plan.period}
                  className={`rounded-2xl p-6 flex flex-col justify-between border transition-all duration-200 ${
                    isPopular
                      ? 'border-[#6320ee] bg-purple-50/30 dark:bg-purple-950/20 shadow-lg ring-2 ring-[#6320ee]/30 relative'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300'
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#6320ee] text-white text-[10px] font-extrabold uppercase tracking-wider py-1 px-3 rounded-full shadow-xs">
                      Best Value · Save 30%
                    </span>
                  )}

                  <div className="flex flex-col gap-4">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {plan.title}
                      </h4>
                      <span className="text-xs text-slate-400 font-medium">
                        {plan.durationLabel} Access
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {price}
                      </span>
                      <span className="text-xs text-slate-400">/{plan.durationLabel}</span>
                    </div>

                    <div className="text-xs font-semibold text-[#6320ee] dark:text-[#a855f7] bg-purple-50 dark:bg-purple-950/40 p-2 rounded-lg">
                      *{plan.storage} Cloud Video Storage
                    </div>

                    <ul className="flex flex-col gap-2 pt-2 text-xs text-slate-600 dark:text-slate-300">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => (onOpenAuth ? onOpenAuth('register') : onGoToDashboard())}
                      className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isPopular
                          ? 'bg-[#6320ee] text-white hover:bg-[#5218cc] shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      Choose Plan
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
              Everything you need to know about 24/7 cloud live streaming with StreamAdda.
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
            <h3 className="text-2xl font-bold tracking-tight text-white">
              StreamAdda
            </h3>
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
              <a href="#home" className="hover:text-white">Home</a>
              <a href="#how-it-works" className="hover:text-white">How it Works</a>
              <a href="#pricing" className="hover:text-white">Pricing</a>
              <button onClick={onGoToDashboard} className="text-left hover:text-white cursor-pointer">Live Slots</button>
              <button onClick={onGoToDashboard} className="text-left hover:text-white cursor-pointer">Cloud Video Storage</button>
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
          <p>© 2026 StreamAdda. All rights reserved.</p>
          <p>Continuous 24x7 RTMP Cloud Video Streaming for Creators.</p>
        </div>
      </footer>
    </div>
  );
};
