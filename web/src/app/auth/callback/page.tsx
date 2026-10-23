"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[Auth Callback] Processing OAuth callback...');
        
        // Get the code from URL
        const code = searchParams.get('code');
        
        if (!code) {
          console.error('[Auth Callback] No code in URL');
          setError('No authorization code found');
          window.location.href = '/register?error=no_code';
          return;
        }

        if (!supabase) {
          console.error('[Auth Callback] Supabase not configured');
          setError('Supabase not configured');
          window.location.href = '/register?error=config_error';
          return;
        }

        // Exchange code for session
        console.log('[Auth Callback] Exchanging code for session...');
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('[Auth Callback] Exchange error:', exchangeError);
          setError(exchangeError.message);
          window.location.href = '/register?error=exchange_failed';
          return;
        }

        if (!data.session) {
          console.error('[Auth Callback] No session returned');
          setError('No session created');
          window.location.href = '/register?error=no_session';
          return;
        }

        console.log('[Auth Callback] Session created successfully for:', data.user?.email);

        // Try to create user profile if it doesn't exist
        if (data.user) {
          try {
            const username = data.user.user_metadata?.user_name ||
                            data.user.user_metadata?.preferred_username ||
                            data.user.email?.split('@')[0] ||
                            `user_${data.user.id.slice(0, 8)}`;

            const displayName = data.user.user_metadata?.full_name ||
                               data.user.user_metadata?.name ||
                               data.user.email?.split('@')[0];

            await supabase.from('user_profiles').upsert({
              id: data.user.id,
              username,
              display_name: displayName,
              elo_rating: 1200,
              best_elo: 1200,
              preferred_language: 'de',
            }, {
              onConflict: 'id',
              ignoreDuplicates: false,
            });

            console.log('[Auth Callback] Profile created/updated');
          } catch (profileErr) {
            console.error('[Auth Callback] Profile creation error:', profileErr);
            // Don't fail the login
          }
        }

        // Wait a moment for state to propagate
        await new Promise(resolve => setTimeout(resolve, 500));

        // Force full page reload to ensure Supabase client picks up the new session
        console.log('[Auth Callback] Redirecting to /play with full page reload');
        window.location.href = '/play';
        
      } catch (err) {
        console.error('[Auth Callback] Unexpected error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        window.location.href = '/register?error=unexpected';
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500 mx-auto"></div>
        <p className="text-slate-400">
          {error ? `Fehler: ${error}` : 'Anmeldung wird abgeschlossen...'}
        </p>
        {error && (
          <button
            onClick={() => router.push('/register')}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white"
          >
            Zurück zur Anmeldung
          </button>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500 mx-auto"></div>
          <p className="text-slate-400">Laden...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
