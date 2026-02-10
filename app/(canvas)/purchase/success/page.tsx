// app/(canvas)/purchase/success/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import useTreeStore from '@/stores/useTreeStore';
import Logo from '@/components/ui/Logo';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { loadTreeData, tree } = useTreeStore();
  const [countdown, setCountdown] = useState(5);

  // Refresh profile data to pick up updated capacity
  useEffect(() => {
    if (tree?.id) {
      loadTreeData(tree.id);
    }
  }, [tree?.id, loadTreeData]);

  // Auto-redirect after countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Redirect when countdown hits 0
  useEffect(() => {
    if (countdown <= 0) {
      router.push('/canvas');
    }
  }, [countdown, router]);

  return (
    <ProtectedRoute>
      <div
        className="fc-app min-h-screen flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #f0faf4 0%, #f7f9f6 30%, #faf8f2 60%, #f5f0eb 100%)' }}
      >
        <div className="max-w-sm mx-auto px-6 text-center">
          {/* Brand mark */}
          <div className="mb-8 flex items-center justify-center gap-2 opacity-60">
            <Logo size="sm" />
            <span className="text-sm font-semibold text-gray-600 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>FamilyCanvas</span>
          </div>

          {/* Success icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>

          <h1
            className="text-2xl font-bold text-gray-900 mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Purchase complete!
          </h1>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            Your capacity has been upgraded. You can now add more people and canvases to your family tree.
          </p>

          <button
            onClick={() => router.push('/canvas')}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/30 hover:from-emerald-400 hover:to-emerald-500 transition-all"
          >
            Back to my tree
          </button>

          <p className="mt-3 text-xs text-gray-400">
            Redirecting in {countdown}s...
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center"
          style={{ background: 'linear-gradient(160deg, #f0faf4 0%, #f7f9f6 30%, #faf8f2 60%, #f5f0eb 100%)' }}
        >
          <div className="animate-pulse text-emerald-600/60 text-sm">Loading...</div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
