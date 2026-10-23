"use client";

import React from 'react';

export interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

class ServiceWorkerManager {
  private state: ServiceWorkerState = {
    isSupported: false,
    isRegistered: false,
    isUpdateAvailable: false,
    registration: null,
  };

  private listeners: Set<(state: ServiceWorkerState) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.state.isSupported = 'serviceWorker' in navigator;
    }
  }

  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.state.isSupported) {
      console.log('[PWA] Service Worker not supported');
      return null;
    }

    try {
      // Never unregister existing workers here: a fresh registration installs a
      // new worker that claims the page on every load, and reloading on that
      // claim made iOS reload in an endless loop.
      try {
        const swCheck = await fetch('/sw.js', { method: 'HEAD', cache: 'no-cache' });
        if (!swCheck.ok) {
          console.error('[PWA] Service Worker file not found at /sw.js (status:', swCheck.status, ')');
          return null;
        }
      } catch (fetchError) {
        console.error('[PWA] Cannot check Service Worker file:', fetchError);
        return null;
      }

      let controlled = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // The first install taking control of the page is not an update.
        if (!controlled) {
          controlled = true;
          return;
        }
        // sw.js activates new versions itself (skipWaiting + clients.claim).
        // Reloading is left to the user so a running game is never interrupted.
        console.log('[PWA] New version active, update available');
        this.state.isUpdateAvailable = true;
        this.notifyListeners();
      });

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      this.state.registration = registration;
      this.state.isRegistered = true;
      this.notifyListeners();

      console.log('[PWA] Service Worker registered successfully:', registration.scope);

      // Check for updates (non-critical)
      try {
        await registration.update();
      } catch (updateError) {
        console.warn('[PWA] Initial update check failed (non-critical):', updateError);
      }

      return registration;
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
      // If registration fails, try to clean up any partial state
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
        console.log('[PWA] Cleaned up failed registration attempt');
      } catch (cleanupError) {
        console.error('[PWA] Cleanup also failed:', cleanupError);
      }
      return null;
    }
  }

  async unregister(): Promise<boolean> {
    if (!this.state.registration) {
      return false;
    }

    try {
      const success = await this.state.registration.unregister();
      if (success) {
        this.state.isRegistered = false;
        this.state.registration = null;
        this.notifyListeners();
        console.log('[PWA] Service Worker unregistered');
      }
      return success;
    } catch (error) {
      console.error('[PWA] Service Worker unregister failed:', error);
      return false;
    }
  }

  applyUpdate(): void {
    this.state.registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }

  async checkForUpdates(): Promise<void> {
    if (!this.state.registration) {
      return;
    }

    try {
      await this.state.registration.update();
    } catch (error) {
      console.error('[PWA] Update check failed:', error);
    }
  }

  getState(): ServiceWorkerState {
    return { ...this.state };
  }

  subscribe(listener: (state: ServiceWorkerState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  async sendMessage(message: any): Promise<void> {
    if (!navigator.serviceWorker.controller) {
      return;
    }

    navigator.serviceWorker.controller.postMessage(message);
  }

  async cacheGameData(url: string, data: any): Promise<void> {
    await this.sendMessage({
      type: 'CACHE_GAME_DATA',
      url,
      payload: data
    });
  }
}

export const swManager = new ServiceWorkerManager();

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  return swManager.register();
}

export function useServiceWorkerUpdate(): {
  isUpdateAvailable: boolean;
  applyUpdate: () => void;
} {
  if (typeof window === 'undefined') {
    return { isUpdateAvailable: false, applyUpdate: () => {} };
  }

  const [state, setState] = React.useState(swManager.getState());

  React.useEffect(() => {
    const unsubscribe = swManager.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    isUpdateAvailable: state.isUpdateAvailable,
    applyUpdate: () => swManager.applyUpdate(),
  };
}
