"use client";

import { supabase } from "@/lib/supabase";
import { loadProgress, saveProgress, migrateLocalToCloud, localProgressToCloud, cloudProgressToLocal, type PlayerProgress, type CloudProgress } from "@/lib/game/progress";

class ProgressSyncService {
  private syncInProgress = false;
  private userId: string | null = null;

  /**
   * Initialize sync service with user ID
   */
  setUserId(userId: string | null) {
    this.userId = userId;
  }

  /**
   * Sync local progress to cloud
   * Called after login or when progress changes
   */
  async syncToCloud(localProgress: PlayerProgress): Promise<boolean> {
    if (!supabase || !this.userId) {
      console.warn("[ProgressSync] Cannot sync: Supabase not configured or no user");
      return false;
    }

    if (this.syncInProgress) {
      console.warn("[ProgressSync] Sync already in progress");
      return false;
    }

    try {
      this.syncInProgress = true;
      console.log("[ProgressSync] Starting sync to cloud...");

      // Check if user already has cloud progress
      const { data: existing, error: fetchError } = await supabase
        .from("player_progress")
        .select("*")
        .eq("user_id", this.userId)
        .maybeSingle();

      if (fetchError) {
        console.error("[ProgressSync] Error fetching cloud progress:", fetchError);
        return false;
      }

      if (existing) {
        // Merge local and cloud, take best values
        console.log("[ProgressSync] Merging local with existing cloud data");
        const cloudProgress = existing as CloudProgress;
        const merged = migrateLocalToCloud(localProgress, cloudProgress);
        
        // Update cloud with merged data
        const updateData = localProgressToCloud(merged, this.userId);
        const { error: updateError } = await supabase
          .from("player_progress")
          .update(updateData)
          .eq("user_id", this.userId);

        if (updateError) {
          console.error("[ProgressSync] Error updating cloud progress:", updateError);
          return false;
        }

        // Save merged data locally
        saveProgress(merged);
        console.log("[ProgressSync] Merge successful, data synced");
      } else {
        // First time: create new cloud entry
        console.log("[ProgressSync] Creating new cloud progress entry");
        const cloudData = localProgressToCloud(localProgress, this.userId);
        const { error: insertError } = await supabase
          .from("player_progress")
          .insert(cloudData);

        if (insertError) {
          console.error("[ProgressSync] Error creating cloud progress:", insertError);
          return false;
        }

        console.log("[ProgressSync] Initial sync successful");
      }

      return true;
    } catch (error) {
      console.error("[ProgressSync] Unexpected error during sync:", error);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Load progress from cloud and merge with local
   * Called after login
   */
  async loadFromCloud(): Promise<PlayerProgress> {
    const localProgress = loadProgress();

    if (!supabase || !this.userId) {
      console.warn("[ProgressSync] Cannot load from cloud: Supabase not configured or no user");
      return localProgress;
    }

    try {
      console.log("[ProgressSync] Loading progress from cloud...");

      const { data, error } = await supabase
        .from("player_progress")
        .select("*")
        .eq("user_id", this.userId)
        .maybeSingle();

      if (error) {
        console.error("[ProgressSync] Error loading cloud progress:", error);
        return localProgress;
      }

      if (!data) {
        console.log("[ProgressSync] No cloud data found, using local");
        return localProgress;
      }

      // Merge cloud and local, take best values
      const cloudProgress = data as CloudProgress;
      const merged = migrateLocalToCloud(localProgress, cloudProgress);
      
      // Save merged data locally
      saveProgress(merged);
      
      console.log("[ProgressSync] Cloud data loaded and merged successfully");
      return merged;
    } catch (error) {
      console.error("[ProgressSync] Unexpected error loading from cloud:", error);
      return localProgress;
    }
  }

  /**
   * Quick update: just push current local state to cloud
   * Used after completing a level
   */
  async quickSync(): Promise<void> {
    if (!supabase || !this.userId) return;

    const localProgress = loadProgress();
    await this.syncToCloud(localProgress);
  }

  /**
   * Check if user has cloud progress
   */
  async hasCloudProgress(): Promise<boolean> {
    if (!supabase || !this.userId) return false;

    try {
      const { data, error } = await supabase
        .from("player_progress")
        .select("user_id")
        .eq("user_id", this.userId)
        .maybeSingle();

      if (error) return false;
      return !!data;
    } catch {
      return false;
    }
  }

  /**
   * Get cloud progress summary (for debugging)
   */
  async getCloudSummary(): Promise<CloudProgress | null> {
    if (!supabase || !this.userId) return null;

    try {
      const { data, error } = await supabase
        .from("player_progress")
        .select("*")
        .eq("user_id", this.userId)
        .maybeSingle();

      if (error || !data) return null;
      return data as CloudProgress;
    } catch {
      return null;
    }
  }
}

export const progressSyncService = new ProgressSyncService();
