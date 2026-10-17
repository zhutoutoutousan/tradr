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

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-yellow-500/90 backdrop-blur-sm text-black px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
          <div className="flex-1">
            <div className="font-semibold">Offline-Modus</div>
            <div className="text-sm">Sie spielen jetzt mit gespeicherten Daten</div>
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
