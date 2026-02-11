// app/check-email/page.tsx
'use client';

import Link from 'next/link';
import Logo from '@/components/ui/Logo';

export default function CheckEmailPage() {
  return (
    <div
      className="fc-app min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #121e19 0%, #1a2f27 50%, #064e3b 100%)' }}
    >
      <div className="max-w-sm mx-auto px-6 text-center">
        {/* Brand mark */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <Logo size="sm" />
          <span
            className="text-lg font-semibold text-white tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            FamilyCanvas
          </span>
        </div>

        {/* Email icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <svg className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>

        <h1
          className="text-2xl font-bold text-white mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Check your email
        </h1>
        <p className="text-sm text-white/50 mb-2 leading-relaxed">
          We sent a confirmation link to your email address.
        </p>
        <p className="text-sm text-white/50 mb-8 leading-relaxed">
          Click the link in the email to activate your account and start building your family tree.
        </p>

        <div className="space-y-3">
          <div className="flex items-start gap-2 bg-white/[0.04] border border-white/10 rounded-xl p-3 text-left">
            <svg className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <p className="text-xs text-white/50 leading-relaxed">
              Don&rsquo;t see it? Check your <strong className="text-white/70">spam or junk folder</strong>.
            </p>
          </div>
          <div className="flex items-start gap-2 bg-white/[0.04] border border-white/10 rounded-xl p-3 text-left">
            <svg className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <p className="text-xs text-white/50 leading-relaxed">
              The email comes from <strong className="text-white/70">noreply@familycanvas.app</strong> (or Supabase while in setup).
            </p>
          </div>
        </div>

        <div className="mt-10">
          <Link
            href="/login"
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Back to log in
          </Link>
        </div>
      </div>
    </div>
  );
}
