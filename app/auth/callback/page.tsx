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

  return <div className="text-sm text-gray-600">Signing you in…</div>;
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Suspense fallback={<div className="text-sm text-gray-600">Loading…</div>}>
        <AuthCallbackHandler />
      </Suspense>
    </div>
  );
}
