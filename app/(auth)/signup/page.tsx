// app/signup/page.tsx (or app/(auth)/signup/page.tsx depending on your structure)
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import Logo from '@/components/ui/Logo';

export default function SignupPage() {
  const router = useRouter();
  const { signUpWithPassword } = useAuth();

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

          {/* Google Sign-In */}
          <GoogleSignInButton
            text="signup_with"
            onError={(err) => setError(err)}
            disabled={submitting}
          />

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
