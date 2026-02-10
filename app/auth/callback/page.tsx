// app/auth/callback/page.tsx
'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace('/login?error=oauth_failed');
          return;
        }
      }
      router.replace('/canvas');
    };

    run();
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Spinner */}
      <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
      <div className="text-sm text-white/50" style={{ fontFamily: 'var(--font-body)' }}>
        Signing you in…
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen fc-bg-dark flex items-center justify-center">
      <Suspense
        fallback={
          <div className="text-sm text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
            Loading…
          </div>
        }
      >
        <AuthCallbackHandler />
      </Suspense>
    </div>
  );
}
