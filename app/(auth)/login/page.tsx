'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithPassword, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const oauthError = searchParams.get('error');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await signInWithPassword(email, password);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      return;
    }
    router.push('/canvas');
  };

  return (
    <div className="w-full max-w-sm border rounded-lg p-6">
      <h1 className="text-xl font-semibold">Log in</h1>

      {oauthError && (
        <div className="mt-3 text-sm text-red-600">Google sign-in failed. Please try again.</div>
      )}
      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          className="w-full rounded bg-black text-white py-2 disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <button
        className="w-full mt-3 rounded border py-2 disabled:opacity-60"
        onClick={() => signInWithGoogle()}
        disabled={submitting}
      >
        Continue with Google
      </button>

      <div className="mt-4 text-sm">
        Don&apos;t have an account?{' '}
        <Link className="underline" href="/signup">
          Sign up
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-sm text-gray-600">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
