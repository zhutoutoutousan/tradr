"use client";

import { useEffect, useState } from 'react';
import { authService, type UserProfile } from '@/lib/auth/supabase-auth';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { user: currentUser } = await authService.getUser();
      setUser(currentUser);

      if (currentUser) {
        const userProfile = await authService.getUserProfile(currentUser.id);
        setProfile(userProfile);
      }

      setLoading(false);
    }

    loadUser();

    const unsubscribe = authService.onAuthStateChange(async (newUser) => {
      setUser(newUser);

      if (newUser) {
        const userProfile = await authService.getUserProfile(newUser.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    });

    return unsubscribe;
  }, []);

  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
  };
}
