// app/signup/page.tsx (or app/(auth)/signup/page.tsx depending on your structure)
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import Logo from '@/components/ui/Logo';

export default function SignupPage() {
  const router = useRouter();
  const { signUpWithPassword, signInWithGoogle } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setSubmitting(false);
      return;
    }

    const res = await signUpWithPassword(email, password, name);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    router.push('/canvas');
  };

  return (
    <div className="min-h-screen fc-bg-dark flex items-center justify-center px-4" style={{ fontFamily: 'var(--font-body)' }}>
      {/* Background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle at 75% 25%, rgba(16, 185, 129, 0.08) 0%, transparent 50%), radial-gradient(circle at 25% 75%, rgba(251, 191, 36, 0.04) 0%, transparent 50%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <Logo size="md" />
          <span className="text-xl font-semibold text-white tracking-tight">FamilyCanvas</span>
        </Link>

        {/* Card */}
        <div className="fc-glass rounded-2xl p-8">
          <h1
            className="text-2xl font-bold text-white text-center mb-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Create your account
          </h1>
          <p className="text-sm text-white/40 text-center mb-6">
            Start building your family tree in minutes
          </p>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Google OAuth */}
          <button
            className="w-full fc-btn-secondary flex items-center justify-center gap-3 py-2.5 rounded-xl"
            onClick={() => signInWithGoogle()}
            disabled={submitting}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign up with Google
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 text-white/30" style={{ background: 'rgba(18, 30, 25, 0.8)' }}>
                or sign up with email
              </span>
            </div>
          </div>

          {/* Email form */}
          <form className="space-y-3" onSubmit={onSubmit}>
            <input
              className="fc-input fc-input-dark"
              placeholder="Your name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
            <input
              className="fc-input fc-input-dark"
              placeholder="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              className="fc-input fc-input-dark"
              placeholder="Password (min 6 characters)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <button
              className="fc-btn-primary w-full py-2.5 rounded-xl"
              disabled={submitting}
              type="submit"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </form>
        </div>

        {/* Login link */}
        <p className="mt-6 text-center text-sm text-white/40">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
