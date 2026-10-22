"use client";

import { supabase } from '@/lib/supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  elo_rating: number;
  best_elo: number;
  total_games: number;
  total_wins: number;
  total_profit: number;
  best_return_pct: number;
  best_single_profit: number;
  created_at: string;
  last_played_at: string | null;
  preferred_language: 'de' | 'en';
  show_in_leaderboard: boolean;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export interface SignUpData {
  email: string;
  password: string;
  username: string;
  displayName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

class AuthService {
  async signUp({ email, password, username, displayName }: SignUpData): Promise<AuthResult> {
    if (!supabase) {
      return {
        user: null,
        session: null,
        error: { message: 'Supabase not configured', name: 'ConfigError', status: 500 } as AuthError
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: displayName || username,
          }
        }
      });

      if (error) return { user: null, session: null, error };
      if (!data.user) {
        return {
          user: null,
          session: null,
          error: { message: 'No user returned', name: 'SignUpError', status: 400 } as AuthError
        };
      }

      // Only create profile if we have an active session
      // If email confirmation is required, profile will be created after confirmation
      if (data.session) {
        try {
          await this.createUserProfile(data.user.id, username, displayName);
        } catch (profileErr) {
          console.error('[Auth] Profile creation failed (non-fatal):', profileErr);
          // Don't fail registration if profile creation fails - can retry later
        }
      }

      return { user: data.user, session: data.session, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err ? String((err as any).message) : String(err));
      return {
        user: null,
        session: null,
        error: { message: errorMessage, name: 'UnknownError', status: 500 } as AuthError
      };
    }
  }

  async signIn({ email, password }: SignInData): Promise<AuthResult> {
    if (!supabase) {
      return {
        user: null,
        session: null,
        error: { message: 'Supabase not configured', name: 'ConfigError', status: 500 } as AuthError
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      return { user: data.user, session: data.session, error };
    } catch (err) {
      return {
        user: null,
        session: null,
        error: { message: String(err), name: 'UnknownError', status: 500 } as AuthError
      };
    }
  }

  async signOut(): Promise<{ error: AuthError | null }> {
    if (!supabase) {
      return { error: { message: 'Supabase not configured', name: 'ConfigError', status: 500 } as AuthError };
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  }

  async getSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    if (!supabase) {
      return { session: null, error: null };
    }

    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  }

  async getUser(): Promise<{ user: User | null; error: AuthError | null }> {
    if (!supabase) {
      return { user: null, error: null };
    }

    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    if (!supabase) return () => {};

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }

  private async createUserProfile(userId: string, username: string, displayName?: string): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        username,
        display_name: displayName || username,
        elo_rating: 1200,
        best_elo: 1200,
        preferred_language: 'de'
      });

    if (error) {
      console.error('[Auth] Failed to create profile:', error);
      throw error;
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Auth] Failed to get profile:', error);
      return null;
    }

    return data;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('[Auth] Failed to update profile:', error);
      throw error;
    }
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    if (!supabase) return false;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (error) return false;
    return !data;
  }
}

export const authService = new AuthService();
