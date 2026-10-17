"use client";

import { offlineStorage } from './offline-storage';
import type { Profile } from '@/lib/game/profile';

const PROFILE_KEY = 'player-profile';
const SYNC_INTERVAL = 5000;

class OfflineSync {
  private syncTimer: NodeJS.Timeout | null = null;
  private lastSync: number = 0;

  startAutoSync(): void {
    if (this.syncTimer) return;
    
    this.syncTimer = setInterval(() => {
      this.syncProfile().catch(console.error);
    }, SYNC_INTERVAL);

    console.log('[Offline Sync] Auto-sync started');
  }

  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('[Offline Sync] Auto-sync stopped');
    }
  }

  async syncProfile(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const profileData = localStorage.getItem('tradr.profile.v1');
      if (!profileData) return;

      const profile = JSON.parse(profileData) as Profile;
      await offlineStorage.cacheData(PROFILE_KEY, {
        profile,
        timestamp: Date.now()
      });

      this.lastSync = Date.now();
    } catch (error) {
      console.error('[Offline Sync] Profile sync failed:', error);
    }
  }

  async restoreProfile(): Promise<Profile | null> {
    try {
      const cached = await offlineStorage.getCachedData(PROFILE_KEY);
      if (!cached) return null;

      return cached.profile as Profile;
    } catch (error) {
      console.error('[Offline Sync] Profile restore failed:', error);
      return null;
    }
  }

  async syncGameData(symbol: string, data: any): Promise<void> {
    try {
      await offlineStorage.cacheData(`market-data-${symbol}`, {
        data,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(`[Offline Sync] Market data sync failed for ${symbol}:`, error);
    }
  }

  async getGameData(symbol: string): Promise<any | null> {
    try {
      const cached = await offlineStorage.getCachedData(`market-data-${symbol}`);
      return cached ? cached.data : null;
    } catch (error) {
      console.error(`[Offline Sync] Market data retrieval failed for ${symbol}:`, error);
      return null;
    }
  }

  async clearOldData(maxAgeDays: number = 7): Promise<void> {
    try {
      const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
      await offlineStorage.clearOldData(maxAge);
      console.log(`[Offline Sync] Cleared data older than ${maxAgeDays} days`);
    } catch (error) {
      console.error('[Offline Sync] Clear old data failed:', error);
    }
  }

  async exportAllData(): Promise<any> {
    try {
      const data = await offlineStorage.exportData();
      
      const profile = localStorage.getItem('tradr.profile.v1');
      const deviceId = localStorage.getItem('tradr.device.v1');
      
      return {
        ...data,
        localStorage: {
          profile: profile ? JSON.parse(profile) : null,
          deviceId
        },
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Offline Sync] Export failed:', error);
      throw error;
    }
  }

  getLastSyncTime(): number {
    return this.lastSync;
  }
}

export const offlineSync = new OfflineSync();

export function startOfflineSync(): void {
  if (typeof window !== 'undefined') {
    offlineSync.startAutoSync();

    window.addEventListener('beforeunload', () => {
      offlineSync.syncProfile().catch(console.error);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        offlineSync.syncProfile().catch(console.error);
      }
    });
  }
}
