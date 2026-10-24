"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { authService } from '@/lib/auth/supabase-auth';
import { resolveAuthNext } from '@/lib/bots/authRedirect';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[Auth Callback] Processing OAuth callback...');
        console.log('[Auth Callback] Full URL:', window.location.href);
        
        // Get the code from URL
        const code = searchParams.get('code');
        const error_code = searchParams.get('error');
        const error_description = searchParams.get('error_description');
        
        // Check for OAuth errors
        if (error_code) {
          console.error('[Auth Callback] OAuth error:', error_code, error_description);
          setError(`OAuth error: ${error_description || error_code}`);
          setTimeout(() => {
            window.location.href = '/register';
          }, 2000);
          return;
        }
        
        if (!code) {
          console.error('[Auth Callback] No code in URL, params:', Object.fromEntries(searchParams.entries()));
          setError('No authorization code found');
          setTimeout(() => {
            window.location.href = '/register';
          }, 2000);
          return;
        }

        if (!supabase) {
          console.error('[Auth Callback] Supabase not configured');
          setError('Supabase not configured');
          setTimeout(() => {
            window.location.href = '/register';
          }, 2000);
          return;
        }

        // The browser client (detectSessionInUrl) exchanges ?code= itself during
        // initialization and then deletes the PKCE verifier, so a second
        // exchangeCodeForSession() would always fail. getSession() waits for that
        // initialization to finish.
        console.log('[Auth Callback] Waiting for session from URL...');
        let { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          const { data: exchanged, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          session = exchanged.session;
          if (!session) {
            ({ data: { session } } = await supabase.auth.getSession());
          }
          if (!session) {
            console.error('[Auth Callback] Exchange error:', exchangeError);
            setError(exchangeError?.message || 'No session created');
            setTimeout(() => {
              window.location.href = '/register';
            }, 2000);
            return;
          }
        }

        const data = { session, user: session.user };

        console.log('[Auth Callback] Session created successfully for:', data.user?.email);
        console.log('[Auth Callback] Session details:', {
          userId: data.user?.id,
          email: data.user?.email,
          provider: data.user?.app_metadata?.provider
        });

        const profile = await authService.ensureUserProfile(data.user);
        console.log('[Auth Callback] Profile ready:', profile?.username ?? 'unavailable');

        // Wait a moment for state to propagate
        console.log('[Auth Callback] Waiting 500ms before redirect...');
        await new Promise(resolve => setTimeout(resolve, 500));

        // Prefer ?next= (survives OAuth landing on production Site URL from a preview).
        const next = resolveAuthNext(searchParams.get('next'), '/play');
        console.log('[Auth Callback] ✅ Success! Redirecting to', next);
        window.location.href = next;
        
      } catch (err) {
        console.error('[Auth Callback] Unexpected error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setTimeout(() => {
          window.location.href = '/register';
        }, 2000);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="text-center max-w-md">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500 mx-auto"></div>
        <p className="text-slate-400 mb-4">
          {error ? `❌ Fehler: ${error}` : '🔄 Anmeldung wird abgeschlossen...'}
        </p>
        {error && (
          <>
            <div className="mt-4 mb-4 p-4 bg-red-900/20 border border-red-800 rounded-lg text-left text-sm text-slate-300">
              <p className="font-bold text-red-400 mb-2">Diagnose:</p>
              <p>Bitte überprüfe die Browser-Konsole (F12) für Details.</p>
              <p className="mt-2">Du wirst in 2 Sekunden zurück zur Anmeldung geleitet...</p>
            </div>
            <button
              onClick={() => window.location.href = '/register'}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white"
            >
              Jetzt zurück zur Anmeldung
            </button>
          </>
        )}
        {!error && (
          <p className="text-xs text-slate-500 mt-4">
            Bitte warten, du wirst automatisch weitergeleitet...
          </p>
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
