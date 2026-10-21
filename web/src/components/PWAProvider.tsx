"use client";

import { useEffect, useState } from 'react';
import { registerServiceWorker, useServiceWorkerUpdate } from '@/lib/pwa/sw-register';
import { startOfflineSync } from '@/lib/pwa/offline-sync';
import { startBackgroundPrecache } from '@/lib/pwa/precache-data';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const isOnline = useOnlineStatus();
  const { isUpdateAvailable, skipWaiting } = useServiceWorkerUpdate();
  const { canInstall, isStandalone, promptInstall } = usePWAInstall();

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

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
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
      
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-emerald-600/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <div className="font-semibold">Offline-Modus aktiv</div>
            <div className="text-sm text-white/90">Tradr funktioniert weiter mit gespeicherten Daten</div>
          </div>
        </div>
      )}

      {isUpdateAvailable && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="font-semibold">Update verfügbar</div>
              <div className="text-sm opacity-90">Neue Version der App ist bereit</div>
            </div>
            <button
              onClick={skipWaiting}
              className="px-3 py-1.5 bg-white text-blue-600 rounded font-semibold text-sm hover:bg-blue-50 transition-colors"
            >
              Aktualisieren
            </button>
          </div>
        </div>
      )}

      {canInstall && !isStandalone && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg z-50 border border-slate-700">
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
          </div>
        </div>
      )}
    </>
  );
}
