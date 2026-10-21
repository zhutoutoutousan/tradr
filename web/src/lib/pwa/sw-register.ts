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
      // Check if SW file exists before registering
      try {
        const swCheck = await fetch('/sw.js', { method: 'HEAD', cache: 'no-cache' });
        if (!swCheck.ok) {
          console.error('[PWA] Service Worker file not found at /sw.js');
          return null;
        }
      } catch (fetchError) {
        console.error('[PWA] Cannot check Service Worker file:', fetchError);
        return null;
      }

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      this.state.registration = registration;
      this.state.isRegistered = true;
      this.notifyListeners();

      console.log('[PWA] Service Worker registered:', registration);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        console.log('[PWA] New Service Worker found');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New Service Worker installed, update available');
            this.state.isUpdateAvailable = true;
            this.notifyListeners();
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Controller changed, reloading page');
        window.location.reload();
      });

      await registration.update();

      return registration;
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
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

  skipWaiting(): void {
    if (!this.state.registration?.waiting) {
      return;
    }

    this.state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
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
  skipWaiting: () => void;
} {
  if (typeof window === 'undefined') {
    return { isUpdateAvailable: false, skipWaiting: () => {} };
  }

  const [state, setState] = React.useState(swManager.getState());

  React.useEffect(() => {
    const unsubscribe = swManager.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    isUpdateAvailable: state.isUpdateAvailable,
    skipWaiting: () => swManager.skipWaiting(),
  };
}
