"use client";

import { useEffect, useState } from 'react';
import { registerServiceWorker, useServiceWorkerUpdate } from '@/lib/pwa/sw-register';
import { startOfflineSync } from '@/lib/pwa/offline-sync';
import { startBackgroundPrecache } from '@/lib/pwa/precache-data';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useSwipeDismiss } from '@/hooks/useSwipeDismiss';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const isOnline = useOnlineStatus();
  const { isUpdateAvailable, skipWaiting } = useServiceWorkerUpdate();
  const { canInstall, isStandalone, promptInstall } = usePWAInstall();
  
  // Swipe dismiss hooks for each banner
  const offlineBanner = useSwipeDismiss();
  const updateBanner = useSwipeDismiss();
  const installBanner = useSwipeDismiss();
  
  // Stable update state to prevent flashing
  const [stableUpdateAvailable, setStableUpdateAvailable] = useState(false);
  
  useEffect(() => {
    if (isUpdateAvailable && !stableUpdateAvailable) {
      console.log('[PWA] Update detected, locking state');
      setStableUpdateAvailable(true);
    }
  }, [isUpdateAvailable, stableUpdateAvailable]);

  useEffect(() => {
    setMounted(true);
    
    if (typeof window !== 'undefined') {
      registerServiceWorker().catch(error => {
        console.error('[PWA] Service Worker registration failed:', error);
      });
      
      startOfflineSync();
      
      if (navigator.onLine) {
        startBackgroundPrecache();
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let lastCheckTime = 0;
    const MIN_CHECK_INTERVAL = 120000; // 2 minutes (increased from 30s)
    let updateCheckCount = 0;
    const MAX_CHECKS = 3; // Only check 3 times per session

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        
        // Hard limit: max 3 checks per session
        if (updateCheckCount >= MAX_CHECKS) {
          console.log('[PWA] Max update checks reached, skipping');
          return;
        }
        
        // Throttle: Don't check if we checked recently
        if (now - lastCheckTime < MIN_CHECK_INTERVAL) {
          console.log('[PWA] Skipping update check (throttled)');
          return;
        }
        
        lastCheckTime = now;
        updateCheckCount++;
        console.log(`[PWA] Update check ${updateCheckCount}/${MAX_CHECKS}`);
        
        import('@/lib/pwa/sw-register').then(({ swManager }) => {
          swManager.checkForUpdates();
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      {!isOnline && !offlineBanner.isDismissed && (
        <div 
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-emerald-600/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 touch-pan-y"
          style={offlineBanner.style}
          {...offlineBanner.handlers}
        >
          <svg className="w-5 h-5 flex-shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <div className="font-semibold">Offline-Modus aktiv</div>
            <div className="text-sm text-white/90">Tradr funktioniert weiter mit gespeicherten Daten</div>
          </div>
          <button
            onClick={offlineBanner.dismiss}
            className="ml-2 text-white/70 hover:text-white transition-colors hidden md:block"
            aria-label="Schließen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {stableUpdateAvailable && !updateBanner.isDismissed && (
        <div 
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 touch-pan-y"
          style={updateBanner.style}
          {...updateBanner.handlers}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="font-semibold">Update verfügbar</div>
              <div className="text-sm opacity-90">Neue Version der App ist bereit</div>
            </div>
            <button
              onClick={() => {
                skipWaiting();
                setStableUpdateAvailable(false);
              }}
              className="px-3 py-1.5 bg-white text-blue-600 rounded font-semibold text-sm hover:bg-blue-50 transition-colors"
            >
              Aktualisieren
            </button>
            <button
              onClick={() => {
                updateBanner.dismiss();
                setStableUpdateAvailable(false);
              }}
              className="ml-2 text-white/70 hover:text-white transition-colors hidden md:block"
              aria-label="Schließen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {canInstall && !isStandalone && !installBanner.isDismissed && (
        <div 
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg z-50 border border-slate-700 touch-pan-y"
          style={installBanner.style}
          {...installBanner.handlers}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="font-semibold">App installieren</div>
              <div className="text-sm text-slate-300">Spielen Sie offline auf Ihrem Gerät</div>
            </div>
            <button
              onClick={promptInstall}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded font-semibold text-sm transition-colors"
            >
              Installieren
            </button>
            <button
              onClick={installBanner.dismiss}
              className="ml-2 text-slate-400 hover:text-white transition-colors hidden md:block"
              aria-label="Schließen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
