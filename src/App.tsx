/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { Slot, VideoItem, UserProfile, BillingPeriod } from './types';
import { BILLING_PLANS } from './config/billingPlans';
import { PRESET_SAMPLE_VIDEOS } from './config/presetVideos';
import { Sidebar, AppView } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { LiveSlotsView } from './components/LiveSlotsView';
import { SlotDetailsView } from './components/SlotDetailsView';
import { VideosView } from './components/VideosView';
import { BillingView } from './components/BillingView';
import { ProfileView } from './components/ProfileView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { LandingPageView } from './components/LandingPageView';
import { AuthModal } from './components/AuthModal';
import { AuthPageView } from './components/AuthPageView';
import { TutorialModal } from './components/TutorialModal';
import { ContactModal } from './components/ContactModal';
import { LiveStreamSimulatorModal } from './components/LiveStreamSimulatorModal';
import {
  auth,
  onAuthStateChanged,
  signInWithGoogle,
  logOutUser,
} from './lib/firebase';
import {
  fetchDbStatus,
  fetchUserProfile,
  saveUserProfile,
  fetchSlots,
  saveSlot,
  deleteSlot,
  fetchVideos,
  saveVideo,
  deleteVideo,
  recordOrder,
  fetchCurrentUser,
  getStoredAuthToken,
  logoutUserSession,
  fetchPublicSettings,
} from './lib/api';
import { startCloudStream, stopCloudStream } from './lib/streamingService';

const DEFAULT_USER: UserProfile = {
  name: 'Streamer',
  id: 'usr_guest',
  email: '',
  avatarInitials: 'S',
  role: 'user',
  status: 'active',
  storageQuotaBytes: 10 * 1024 * 1024 * 1024,
  country: 'India',
  city: 'Mohali',
  phone: '',
  phoneCode: '+91',
  theme: 'light',
};

const DEFAULT_INITIAL_SLOT: Slot = {
  id: '6ae0fddc4863791bef736a11',
  name: 'Slot 1793129948103',
  status: 'active',
  streamStatus: 'Off',
  expireOn: '30 Oct 2026 - 04:29 PM',
  expiresAt: Date.now() + 14 * 3600 * 1000 + 30 * 60 * 1000 + 38 * 1000,
  streamKey: 'hdef-dcea-vtkm-m7hw-50s0',
  platform: 'YouTube',
  streamLoop: true,
  streamEndTime: 'October 30th, 2026 04:29 PM',
  videoId: 'vid-lofi-01',
};

// 10 minutes session inactivity timeout in milliseconds
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

export default function App() {
  // Page Mode: 'app' (App Console), 'landing' (Public Marketing Website), or 'auth' (Dedicated Auth Page)
  // Requirement 1: Always open the home (landing) page first when software starts
  const [mode, setMode] = useState<'app' | 'landing' | 'auth'>('landing');

  // App Console Subview
  const [currentView, setCurrentView] = useState<AppView>('dashboard');

  // Mobile menu drawer
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals & Auth Dialogs
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isLiveMonitorOpen, setIsLiveMonitorOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [showInactivityModal, setShowInactivityModal] = useState(false);

  // Inactivity tracking reference
  const lastActivityRef = useRef<number>(Date.now());

  // Pending view navigation after login/registration
  const pendingViewRef = useRef<AppView | null>(null);
  const pendingPlanPeriodRef = useRef<BillingPeriod | null>(null);

  // MySQL Backend Database & Authentication status
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isAuthenticatedGoogle, setIsAuthenticatedGoogle] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const token = getStoredAuthToken();
    if (!token) return false;
    const lastActiveStr = localStorage.getItem('streamadda_last_active');
    if (lastActiveStr) {
      const lastActive = parseInt(lastActiveStr, 10);
      if (Date.now() - lastActive >= INACTIVITY_TIMEOUT_MS) {
        logoutUserSession();
        localStorage.removeItem('streamadda_last_active');
        return false;
      }
    }
    return true;
  });

  // User Profile State
  const [user, setUser] = useState<UserProfile>(() => {
    const token = getStoredAuthToken();
    if (!token) return DEFAULT_USER;
    const lastActiveStr = localStorage.getItem('streamadda_last_active');
    if (lastActiveStr) {
      const lastActive = parseInt(lastActiveStr, 10);
      if (Date.now() - lastActive >= INACTIVITY_TIMEOUT_MS) {
        return DEFAULT_USER;
      }
    }
    const saved = localStorage.getItem('streamadda_user');
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });

  // Strict Dashboard Guard: Only open dashboard when user is logged in
  useEffect(() => {
    if (mode === 'app' && !isAuthenticated) {
      setMode('landing');
      setCurrentView('dashboard');
    }
  }, [mode, isAuthenticated]);

  // Requirement 3: User auto-close / auto-logout if not used for 10 minutes
  useEffect(() => {
    if (!isAuthenticated) return;

    lastActivityRef.current = Date.now();
    localStorage.setItem('streamadda_last_active', Date.now().toString());

    let lastPersistedTime = Date.now();

    const handleUserActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      // Throttled persistence to localStorage every 10 seconds
      if (now - lastPersistedTime > 10000) {
        lastPersistedTime = now;
        localStorage.setItem('streamadda_last_active', now.toString());
      }
    };

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ];

    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    const checkInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        // 10 minutes of inactivity reached: close user session & return to home page
        logoutUserSession();
        localStorage.removeItem('streamadda_last_active');
        logOutUser().catch(() => {});
        setIsAuthenticated(false);
        setUser(DEFAULT_USER);
        setVideos([]);
        setSlots([]);
        setMode('landing');
        setCurrentView('dashboard');
        setShowInactivityModal(true);
      }
    }, 5000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(checkInterval);
    };
  }, [isAuthenticated]);

  // Strict Admin Privilege: requires user to be actively authenticated AND have role === 'admin'
  const isAdmin = Boolean(isAuthenticated && user?.role === 'admin');

  // Security guard: If viewing admin view but not logged in as admin, redirect to dashboard
  useEffect(() => {
    if (currentView === 'admin' && !isAdmin) {
      setCurrentView('dashboard');
    }
  }, [currentView, isAdmin]);

  // Theme State
  const [isDark, setIsDark] = useState<boolean>(() => {
    return user.theme === 'dark';
  });

  // Slots State
  const [slots, setSlots] = useState<Slot[]>(() => {
    const savedUser = localStorage.getItem('streamadda_user');
    const uId = savedUser ? JSON.parse(savedUser).id : 'usr_guest';
    const saved = localStorage.getItem(`streamadda_slots_${uId}`) || localStorage.getItem('streamadda_slots');
    return saved ? JSON.parse(saved) : [];
  });

  // Videos State
  const [videos, setVideos] = useState<VideoItem[]>(() => {
    const savedUser = localStorage.getItem('streamadda_user');
    const uId = savedUser ? JSON.parse(savedUser).id : 'usr_guest';
    const saved = localStorage.getItem(`streamadda_videos_${uId}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Selected slot for Slot Details view
  const [selectedSlotId, setSelectedSlotId] = useState<string>(
    slots[0]?.id || DEFAULT_INITIAL_SLOT.id
  );

  // Sync theme changes with DOM
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Auth state listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setIsAuthenticatedGoogle(true);
        setUser((prev) => {
          const updated: UserProfile = {
            ...prev,
            id: firebaseUser.uid,
            name: firebaseUser.displayName || prev.name,
            email: firebaseUser.email || prev.email,
            avatarInitials: (firebaseUser.displayName?.charAt(0) || firebaseUser.email?.charAt(0) || 'U').toUpperCase(),
          };
          saveUserProfile(updated).catch(console.error);
          return updated;
        });
      } else {
        setIsAuthenticatedGoogle(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Fetch initial data from MySQL backend & keep in sync
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const dbStatus = await fetchDbStatus();
        if (isMounted) {
          setIsRealtimeConnected(dbStatus.connected);
        }

        // 1. Fetch user (authenticated session takes precedence)
        const token = getStoredAuthToken();
        let remoteUser: UserProfile | null = null;
        if (token) {
          try {
            remoteUser = await fetchCurrentUser();
            if (remoteUser && isMounted) {
              setIsAuthenticated(true);
            }
          } catch {
            if (isMounted) {
              setIsAuthenticated(false);
              logoutUserSession();
            }
          }
        }
        if (!remoteUser) {
          remoteUser = await fetchUserProfile(user.id);
        }
        if (isMounted && remoteUser) {
          setUser(remoteUser);
          setIsDark(remoteUser.theme === 'dark');
          localStorage.setItem('streamadda_user', JSON.stringify(remoteUser));
        } else if (isMounted) {
          saveUserProfile(user).catch(console.error);
        }

        // 2. Fetch slots from MySQL for this user
        const targetUserId = remoteUser?.id || user.id;
        const remoteSlots = await fetchSlots(targetUserId);
        if (isMounted) {
          // Users only have slots they have subscribed to and paid for (no free trial)
          setSlots(remoteSlots || []);
          if (remoteSlots && remoteSlots.length > 0) {
            setSelectedSlotId(remoteSlots[0].id);
          } else {
            setSelectedSlotId('');
          }
          localStorage.setItem(`streamadda_slots_${targetUserId}`, JSON.stringify(remoteSlots || []));
        }

        // 3. Fetch videos from MySQL strictly for this user (never expose other users' database videos)
        const remoteVideos = await fetchVideos(targetUserId);
        if (isMounted) {
          setVideos(remoteVideos || []);
          localStorage.setItem(`streamadda_videos_${targetUserId}`, JSON.stringify(remoteVideos || []));
        }

        // 4. Fetch site settings & apply SEO meta tags dynamically
        try {
          const siteSettings = await fetchPublicSettings();
          if (siteSettings.site_title) {
            document.title = siteSettings.site_title;
          }
          if (siteSettings.meta_description) {
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
              metaDesc = document.createElement('meta');
              metaDesc.setAttribute('name', 'description');
              document.head.appendChild(metaDesc);
            }
            metaDesc.setAttribute('content', siteSettings.meta_description);
          }
          if (siteSettings.meta_keywords) {
            let metaKeywords = document.querySelector('meta[name="keywords"]');
            if (!metaKeywords) {
              metaKeywords = document.createElement('meta');
              metaKeywords.setAttribute('name', 'keywords');
              document.head.appendChild(metaKeywords);
            }
            metaKeywords.setAttribute('content', siteSettings.meta_keywords);
          }
        } catch {}
      } catch (err) {
        console.warn('MySQL backend fetch error:', err);
      }
    }

    loadData();

    // Check DB status & slots periodically
    const timer = setInterval(() => {
      fetchDbStatus()
        .then((s) => {
          if (isMounted) setIsRealtimeConnected(s.connected);
        })
        .catch(() => {
          if (isMounted) setIsRealtimeConnected(false);
        });

      const currentUid = (user?.id && user.id !== 'usr_guest') ? user.id : undefined;
      if (currentUid) {
        fetchSlots(currentUid)
          .then((s) => {
            if (isMounted && s) setSlots(s);
          })
          .catch(() => {});
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [user.id]);

  // Automatic Slot Expiration Watchdog: Detects slot expiration in real-time, stops active broadcasts, and sets status to expired
  useEffect(() => {
    const watchdogTimer = setInterval(() => {
      const now = Date.now();
      setSlots((prev) => {
        let hasChanges = false;
        const checkedSlots = prev.map((s) => {
          const isSlotExpired = Boolean(s.expiresAt) && s.expiresAt! > 0 && s.expiresAt! <= now;
          if (isSlotExpired && (s.status !== 'expired' || s.streamStatus === 'Live')) {
            hasChanges = true;
            // Stop active cloud broadcast immediately
            if (s.streamStatus === 'Live') {
              stopCloudStream(s.id).catch(() => {});
            }
            const updatedExpired: Slot = {
              ...s,
              status: 'expired',
              streamStatus: 'Off',
            };
            saveSlot(updatedExpired).catch(() => {});
            return updatedExpired;
          }
          return s;
        });

        if (hasChanges) {
          const uId = user.id || 'usr_guest';
          localStorage.setItem(`streamadda_slots_${uId}`, JSON.stringify(checkedSlots));
          return checkedSlots;
        }
        return prev;
      });
    }, 5000);

    return () => clearInterval(watchdogTimer);
  }, [user.id]);

  const handleToggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    const updatedUser = { ...user, theme: newTheme as 'light' | 'dark' };
    setUser(updatedUser);
    saveUserProfile(updatedUser).catch(console.error);
  };

  const handleSetTheme = (theme: 'light' | 'dark') => {
    setIsDark(theme === 'dark');
    const updatedUser = { ...user, theme };
    setUser(updatedUser);
    saveUserProfile(updatedUser).catch(console.error);
  };

  const handleUpdateUser = (updated: Partial<UserProfile>) => {
    const updatedUser = { ...user, ...updated };
    setUser(updatedUser);
    saveUserProfile(updatedUser).catch(console.error);
  };

  const handleSignInGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error('Sign-in failed', e);
    }
  };

  const handleOpenAuth = (authMode: 'login' | 'register' = 'login', asPage = false) => {
    setAuthModalMode(authMode);
    if (asPage) {
      setMode('auth');
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleGoToSlots = (preferredPlan?: BillingPeriod) => {
    if (preferredPlan) {
      pendingPlanPeriodRef.current = preferredPlan;
    }
    if (isAuthenticated) {
      setMode('app');
      setCurrentView('live-slots');
    } else {
      pendingViewRef.current = 'live-slots';
      handleOpenAuth('register');
    }
  };

  const handleAuthSuccess = async (authedUser: UserProfile) => {
    localStorage.setItem('streamadda_last_active', Date.now().toString());
    lastActivityRef.current = Date.now();
    setUser(authedUser);
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
    setShowInactivityModal(false);

    // Route to pending view (e.g. live-slots) if clicked from landing, or admin / live-slots
    const targetView: AppView = pendingViewRef.current || (authedUser.role === 'admin' ? 'admin' : 'live-slots');
    pendingViewRef.current = null;
    setMode('app');
    setCurrentView(targetView);
    if (authedUser.theme) {
      setIsDark(authedUser.theme === 'dark');
    }
    localStorage.setItem('streamadda_user', JSON.stringify(authedUser));

    // Immediately fetch this user's videos & slots strictly from MySQL
    try {
      const userVideos = await fetchVideos(authedUser.id);
      setVideos(userVideos || []);
      localStorage.setItem(`streamadda_videos_${authedUser.id}`, JSON.stringify(userVideos || []));

      const userSlots = await fetchSlots(authedUser.id);
      setSlots(userSlots || []);
      if (userSlots && userSlots.length > 0) {
        setSelectedSlotId(userSlots[0].id);
      } else {
        setSelectedSlotId('');
      }
      localStorage.setItem(`streamadda_slots_${authedUser.id}`, JSON.stringify(userSlots || []));
    } catch (err) {
      console.error('Failed to load user-specific database records:', err);
    }
  };

  const handleLogout = async () => {
    if (confirm('Do you want to log out of Stream LIVE?')) {
      logoutUserSession();
      localStorage.removeItem('streamadda_last_active');
      await logOutUser().catch(() => {});
      setUser(DEFAULT_USER);
      setIsAuthenticated(false);
      setVideos([]);
      setSlots([]);
      setCurrentView('dashboard');
      setMode('landing');
    }
  };

  // Slot handlers with MySQL Backend Persistence
  const handleSelectSlot = (slot: Slot) => {
    setSelectedSlotId(slot.id);
    setCurrentView('slot-details');
  };

  const handleUpdateSlot = (updated: Slot) => {
    const slotWithUser: Slot = {
      ...updated,
      userId: updated.userId || user.id,
    };
    setSlots((prev) => prev.map((s) => (s.id === slotWithUser.id ? slotWithUser : s)));
    localStorage.setItem(
      `streamadda_slots_${user.id}`,
      JSON.stringify(slots.map((s) => (s.id === slotWithUser.id ? slotWithUser : s)))
    );
    saveSlot(slotWithUser).catch(console.error);

    // If stream is active and key or video changed, restart cloud stream
    if (updated.streamStatus === 'Live' && updated.streamKey?.trim()) {
      const activeVideo = videos.find((v) => v.id === updated.videoId) || videos[0];
      const videoPath = activeVideo?.videoPath || (activeVideo?.videoUrl?.startsWith('/') ? `public${activeVideo.videoUrl}` : activeVideo?.videoUrl || 'public/videos/lofi-chill.mp4');
      startCloudStream({
        slotId: updated.id,
        streamKey: updated.streamKey,
        platform: updated.platform,
        customRtmpUrl: updated.rtmpServerUrl,
        videoPath,
        targetBitrateKbps: updated.targetBitrateKbps,
        fps: updated.fpsPreset,
        audioBitrateKbps: updated.audioBitrateKbps,
      }).catch(console.error);
    }
  };

  const handleToggleStream = (slotId: string, overrides?: Partial<Slot>) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id === slotId) {
          const merged: Slot = overrides ? { ...s, ...overrides } : s;
          const willBeLive = overrides?.streamStatus
            ? overrides.streamStatus === 'Live'
            : s.streamStatus !== 'Live';

          if (willBeLive) {
            // Guard: Prevent broadcasting on expired or unapproved slots
            const isSlotExpired = s.status === 'expired' || (Boolean(s.expiresAt) && s.expiresAt! > 0 && s.expiresAt! <= Date.now());
            if (isSlotExpired) {
              alert('This slot subscription has expired. Please renew your subscription to stream live.');
              const expiredSlot: Slot = { ...s, status: 'expired', streamStatus: 'Off' };
              saveSlot(expiredSlot).catch(console.error);
              return expiredSlot;
            }
            if (s.status === 'pending_approval') {
              alert('This slot is pending payment approval. You can start broadcasting once verified by an admin.');
              return s;
            }

            setIsLiveMonitorOpen(true);
            setSelectedSlotId(slotId);

            // Launch actual cloud streaming process via FFmpeg with the real stream key, selected video, and configured quality!
            const targetVideoId = merged.videoId || s.videoId || videos[0]?.id;
            const activeVideo = videos.find((v) => v.id === targetVideoId) || videos[0];
            const videoPath =
              activeVideo?.videoPath ||
              (activeVideo?.videoUrl?.startsWith('/')
                ? `public${activeVideo.videoUrl}`
                : activeVideo?.videoUrl || 'public/videos/lofi-chill.mp4');

            startCloudStream({
              slotId: merged.id,
              streamKey: merged.streamKey,
              platform: merged.platform || 'YouTube',
              customRtmpUrl: merged.rtmpServerUrl,
              videoPath,
              targetBitrateKbps: merged.targetBitrateKbps,
              fps: merged.fpsPreset,
              audioBitrateKbps: merged.audioBitrateKbps,
            }).catch(console.error);
          } else {
            // Stop cloud streaming process
            stopCloudStream(slotId).catch(console.error);
          }
          const updatedSlot: Slot = {
            ...merged,
            streamStatus: willBeLive ? 'Live' : 'Off',
          };
          if (willBeLive) {
            updatedSlot.startedAt = s.startedAt || Date.now();
          } else {
            delete updatedSlot.startedAt;
          }
          saveSlot(updatedSlot).catch(console.error);
          return updatedSlot;
        }
        return s;
      })
    );
  };

  const handleDeleteSlot = (slotId: string) => {
    setSlots((prev) => {
      const remaining = prev.filter((s) => s.id !== slotId);
      localStorage.setItem('streamadda_slots', JSON.stringify(remaining));
      return remaining;
    });
    deleteSlot(slotId).catch(console.error);
    if (selectedSlotId === slotId) {
      setSelectedSlotId(slots.find((s) => s.id !== slotId)?.id || '');
    }
  };

  const handleAddSlot = (
    slotName: string,
    scheduleStart?: boolean,
    startTime?: string,
    streamKey?: string,
    videoId?: string,
    platform?: StreamingPlatform,
    planId?: string,
    requireApproval: boolean = true
  ): Slot => {
    let days = 30;
    const lowerPlan = String(planId || '').toLowerCase();
    if (lowerPlan.includes('3 month') || lowerPlan.includes('quarter')) days = 90;
    else if (lowerPlan.includes('month') || lowerPlan === 'months') days = 30;
    else if (lowerPlan.includes('week') || lowerPlan === 'weeks') days = 7;
    else if (lowerPlan.includes('day') || lowerPlan === 'days') days = 1;

    const expiresAt = Date.now() + days * 24 * 3600 * 1000;
    const d = new Date(expiresAt);
    const expireOn = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()} - 11:59 PM`;

    const isUserAdmin = user?.role === 'admin';
    const status: SlotStatus = (!requireApproval || isUserAdmin) ? 'active' : 'pending_approval';

    const newSlot: Slot = {
      id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: user?.id,
      name: slotName,
      status,
      streamStatus: 'Off',
      scheduleStartEnabled: scheduleStart,
      streamStartTime: startTime || 'October 30th, 2026 06:00 PM',
      expireOn: status === 'pending_approval' ? 'Pending Approval' : expireOn,
      expiresAt: status === 'pending_approval' ? 0 : expiresAt,
      streamKey: streamKey?.trim() || '',
      platform: platform || 'YouTube',
      streamLoop: true,
      streamEndTime: expireOn,
      videoId: videoId || videos[0]?.id,
      subscriptionPlanId: planId || 'Months',
      paymentStatus: status === 'pending_approval' ? 'pending' : 'approved',
    };
    setSlots((prev) => [newSlot, ...prev]);
    setSelectedSlotId(newSlot.id);
    saveSlot(newSlot).catch(console.error);
    return newSlot;
  };

  const handleScheduleStream = (slotId: string, startTime: string) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id === slotId) {
          const updated: Slot = {
            ...s,
            scheduleStartEnabled: true,
            streamStartTime: startTime,
            streamStatus: 'Scheduled',
          };
          saveSlot(updated).catch(console.error);
          return updated;
        }
        return s;
      })
    );
  };

  const handleCancelSchedule = (slotId: string) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id === slotId) {
          const updated: Slot = {
            ...s,
            scheduleStartEnabled: false,
            streamStatus: 'Off',
          };
          saveSlot(updated).catch(console.error);
          return updated;
        }
        return s;
      })
    );
  };

  // Video handlers with MySQL Backend Persistence (strictly user-scoped)
  const handleAddVideo = (video: VideoItem) => {
    const videoWithUser: VideoItem = {
      ...video,
      userId: user.id,
    };
    setVideos((prev) => {
      const updated = [videoWithUser, ...prev];
      localStorage.setItem(`streamadda_videos_${user.id}`, JSON.stringify(updated));
      return updated;
    });
    saveVideo(videoWithUser).catch(console.error);
  };

  const handleDeleteVideo = (videoId: string) => {
    setVideos((prev) => {
      const remaining = prev.filter((v) => v.id !== videoId);
      localStorage.setItem(`streamadda_videos_${user.id}`, JSON.stringify(remaining));
      return remaining;
    });
    deleteVideo(videoId).catch(console.error);
    import('./lib/videoStorage').then(({ deleteLocalVideoBlob }) => {
      deleteLocalVideoBlob(videoId).catch(console.error);
    });
    // Unlink from slots
    setSlots((prev) =>
      prev.map((s) => {
        if (s.videoId === videoId) {
          const updated = { ...s, videoId: undefined };
          saveSlot(updated).catch(console.error);
          return updated;
        }
        return s;
      })
    );
  };

  // Billing renewal/add with Subscription Plan and Payment Approval
  const handleRenewSlot = (slotId: string, period: BillingPeriod, count: number, utrNumber?: string) => {
    const isUserAdmin = user?.role === 'admin';
    const addedDays = period === '3 Months' ? 90 : period === 'Months' ? 30 : period === 'Weeks' ? 7 : 1;
    const plan = BILLING_PLANS[period];

    setSlots((prev) =>
      prev.map((s) => {
        if (s.id === slotId) {
          if (isUserAdmin) {
            const currentExp = s.expiresAt && s.expiresAt > Date.now() ? s.expiresAt : Date.now();
            const newExpiresAt = currentExp + addedDays * count * 24 * 3600 * 1000;
            const d = new Date(newExpiresAt);
            const dateStr = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()} - 11:59 PM`;
            const updatedSlot: Slot = {
              ...s,
              status: 'active',
              paymentStatus: 'approved',
              expiresAt: newExpiresAt,
              expireOn: dateStr,
              subscriptionPlanId: period,
            };
            saveSlot(updatedSlot).catch(console.error);

            recordOrder({
              id: `ord-${Date.now()}`,
              userId: user.id,
              slotId: s.id,
              period,
              count,
              currency: 'INR',
              amount: (plan?.priceINR || 1999) * count,
              status: 'completed',
              createdAt: new Date().toISOString(),
            }).catch(console.error);

            return updatedSlot;
          }

          // Non-admin renewal: requires admin payment approval
          const updatedSlot: Slot = {
            ...s,
            paymentStatus: 'pending',
            subscriptionPlanId: period,
            pendingUtrNumber: utrNumber,
          };
          saveSlot(updatedSlot).catch(console.error);

          recordOrder({
            id: `ord-${Date.now()}`,
            userId: user.id,
            slotId: s.id,
            period,
            count,
            currency: 'INR',
            amount: (plan?.priceINR || 1999) * count,
            status: 'pending',
            createdAt: new Date().toISOString(),
          }).catch(console.error);

          return updatedSlot;
        }
        return s;
      })
    );
  };

  const handleApproveSlotFromAdmin = (slotId: string, planId?: string) => {
    let days = 30;
    const lowerPlan = String(planId || '').toLowerCase();
    if (lowerPlan.includes('3 month') || lowerPlan.includes('quarter')) days = 90;
    else if (lowerPlan.includes('month') || lowerPlan === 'months') days = 30;
    else if (lowerPlan.includes('week') || lowerPlan === 'weeks') days = 7;
    else if (lowerPlan.includes('day') || lowerPlan === 'days') days = 1;

    setSlots((prev) =>
      prev.map((s) => {
        if (s.id === slotId || (slotId === '' && s.status === 'pending_approval')) {
          const currentExp = s.expiresAt && s.expiresAt > Date.now() ? s.expiresAt : Date.now();
          const newExpiresAt = currentExp + days * 24 * 3600 * 1000;
          const d = new Date(newExpiresAt);
          const dateStr = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()} - 11:59 PM`;
          const updated: Slot = {
            ...s,
            status: 'active',
            paymentStatus: 'approved',
            expiresAt: newExpiresAt,
            expireOn: dateStr,
          };
          saveSlot(updated).catch(console.error);
          return updated;
        }
        return s;
      })
    );

    // Also immediately refresh user slots from backend
    const currentUid = (user?.id && user.id !== 'usr_guest') ? user.id : undefined;
    if (currentUid) {
      fetchSlots(currentUid)
        .then((s) => {
          if (s && s.length > 0) setSlots(s);
        })
        .catch(() => {});
    }
  };

  const handleAddSlotsPurchased = (period: BillingPeriod, count: number) => {
    const isUserAdmin = user?.role === 'admin';
    for (let i = 0; i < count; i++) {
      handleAddSlot(
        `Slot ${Date.now() + i}`,
        false,
        undefined,
        undefined,
        undefined,
        'YouTube',
        period,
        !isUserAdmin // require approval if not admin
      );
    }
    const plan = BILLING_PLANS[period];
    recordOrder({
      id: `ord-${Date.now()}`,
      userId: user.id,
      period,
      count,
      currency: 'INR',
      amount: (plan?.priceINR || 1999) * count,
      status: isUserAdmin ? 'completed' : 'pending',
      createdAt: new Date().toISOString(),
    }).catch(console.error);
  };

  const currentActiveSlot = slots.find((s) => s.id === selectedSlotId) || slots[0] || null;
  const activeStreamingSlot = slots.find((s) => s.id === selectedSlotId) || slots.find((s) => s.streamStatus === 'Live') || currentActiveSlot;
  const currentSlotVideo = videos.find((v) => v.id === activeStreamingSlot?.videoId) || videos[0];

  // Resolve Header Title based on current view
  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Dashboard';
      case 'live-slots':
        return 'Live Slots';
      case 'slot-details':
        return 'Live slot details';
      case 'videos':
        return 'Videos';
      case 'billing':
        return 'Billing';
      case 'profile':
        return 'Profile';
      case 'admin':
        return 'Admin Control Center';
      default:
        return 'Dashboard';
    }
  };

  // Dedicated Full-Page Auth View (Sign In / Register)
  if (mode === 'auth') {
    return (
      <>
        <AuthPageView
          initialMode={authModalMode}
          onAuthSuccess={handleAuthSuccess}
          onGoBackToLanding={() => setMode('landing')}
        />
        <ContactModal
          isOpen={isContactOpen}
          onClose={() => setIsContactOpen(false)}
        />
      </>
    );
  }

  // If in public landing page mode
  if (mode === 'landing') {
    return (
      <>
        <LandingPageView
          onGoToDashboard={() => {
            if (isAuthenticated) {
              setMode('app');
              setCurrentView('dashboard');
            } else {
              handleOpenAuth('login');
            }
          }}
          onGoToSlots={handleGoToSlots}
          onOpenContact={() => setIsContactOpen(true)}
          onOpenAuth={(authMode) => handleOpenAuth(authMode || 'login')}
          isAuthenticated={isAuthenticated}
          user={user}
          onLogout={handleLogout}
        />
        <ContactModal
          isOpen={isContactOpen}
          onClose={() => setIsContactOpen(false)}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          initialMode={authModalMode}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />

        {/* Inactivity Auto-Close Notification Modal */}
        {showInactivityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Session Closed
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Your session was automatically closed due to 10 minutes of inactivity. Please sign in again to access your dashboard.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowInactivityModal(false);
                  handleOpenAuth('login');
                }}
                className="w-full py-2.5 px-4 bg-[#6320ee] hover:bg-[#5218cc] text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer shadow-md"
              >
                Sign In Again
              </button>
              <button
                onClick={() => setShowInactivityModal(false)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition-colors cursor-pointer"
              >
                Continue to Home
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // App Console Mode (Dashboard, Live Slots, Slot Details, Videos, Billing, Profile)
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onOpenContact={() => setIsContactOpen(true)}
        onSwitchToLanding={() => setMode('landing')}
        onLogout={handleLogout}
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        onOpenAuth={(authMode) => handleOpenAuth(authMode || 'login')}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area (offset by 64px for sidebar on desktop) */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        {/* Top Header */}
        <Header
          title={getViewTitle()}
          user={user}
          isDark={isDark}
          isRealtimeConnected={isRealtimeConnected}
          isAuthenticated={isAuthenticated}
          onOpenAuth={(authMode) => handleOpenAuth(authMode || 'login')}
          onLogout={handleLogout}
          onToggleTheme={handleToggleTheme}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onNavigateToProfile={() => setCurrentView('profile')}
          onNavigateToAdmin={isAdmin ? () => setCurrentView('admin') : undefined}
          onSwitchToLanding={() => setMode('landing')}
        />

        {/* Dynamic View Render */}
        <main className="flex-1 pb-16">
          {currentView === 'dashboard' && (
            <DashboardView
              slots={slots}
              videos={videos}
              onNavigate={(view) => setCurrentView(view)}
              onSelectSlot={handleSelectSlot}
            />
          )}

          {currentView === 'live-slots' && (
            <LiveSlotsView
              slots={slots}
              videos={videos}
              user={user}
              onSelectSlot={handleSelectSlot}
              onNavigate={(view) => setCurrentView(view)}
              onToggleStream={handleToggleStream}
              onDeleteSlot={handleDeleteSlot}
              onAddSlot={handleAddSlot}
              onRenewSlot={handleRenewSlot}
              initialPlanPeriod={pendingPlanPeriodRef.current || undefined}
            />
          )}

          {currentView === 'slot-details' && (
            currentActiveSlot ? (
              <SlotDetailsView
                slot={currentActiveSlot}
                videos={videos}
                onUpdateSlot={handleUpdateSlot}
                onNavigate={(view) => setCurrentView(view)}
                onToggleStream={handleToggleStream}
                onScheduleStream={handleScheduleStream}
                onCancelSchedule={handleCancelSchedule}
              />
            ) : (
              <div className="max-w-2xl mx-auto px-6 py-20 text-center flex flex-col items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-[#6320ee] dark:text-[#a855f7] flex items-center justify-center">
                  <Radio className="w-8 h-8" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    No Live Slots Available
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                    You don't have any active streaming slots yet. Subscribe to a plan to start broadcasting 24/7 continuous loops with zero computer usage.
                  </p>
                </div>
                <button
                  onClick={() => setCurrentView('live-slots')}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Go to Live Slots & Subscribe
                </button>
              </div>
            )
          )}

          {currentView === 'videos' && (
            <VideosView
              videos={videos}
              user={user}
              onAddVideo={handleAddVideo}
              onDeleteVideo={handleDeleteVideo}
            />
          )}

          {currentView === 'billing' && (
            <BillingView
              slots={slots}
              user={user}
              onRenewSlot={handleRenewSlot}
              onAddSlotsPurchased={handleAddSlotsPurchased}
              onOpenContact={() => setIsContactOpen(true)}
            />
          )}

          {currentView === 'profile' && (
            <ProfileView
              user={user}
              isDark={isDark}
              onUpdateUser={handleUpdateUser}
              onSetTheme={handleSetTheme}
              onLogout={handleLogout}
            />
          )}

          {currentView === 'admin' && isAdmin && (
            <AdminDashboardView
              currentUser={user}
              slots={slots}
              videos={videos}
              onNavigateToSlots={() => setCurrentView('live-slots')}
              onApproveSlot={handleApproveSlotFromAdmin}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onGoToSlots={() => setCurrentView('live-slots')}
      />

      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />

      {isLiveMonitorOpen && activeStreamingSlot && (
        <LiveStreamSimulatorModal
          isOpen={isLiveMonitorOpen}
          slot={activeStreamingSlot}
          video={currentSlotVideo}
          slots={slots}
          videos={videos}
          onSelectSlot={(s) => setSelectedSlotId(s.id)}
          onClose={() => setIsLiveMonitorOpen(false)}
          onStopStream={() => handleToggleStream(activeStreamingSlot.id)}
          onUpdateStreamKey={(newKey) => {
            const updated: Slot = { ...activeStreamingSlot, streamKey: newKey };
            handleUpdateSlot(updated);
          }}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
