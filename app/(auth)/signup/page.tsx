'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

export default function SignupPage() {
  const router = useRouter();
  const { signUpWithPassword, signInWithGoogle } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await signUpWithPassword(email, password, fullName);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    // Depending on Supabase email confirmation settings, user may need to confirm.
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm border rounded-lg p-6">
        <h1 className="text-xl font-semibold">Sign up</h1>

        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
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
            {submitting ? 'Creating…' : 'Create account'}
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
          Already have an account?{' '}
          <Link className="underline" href="/login">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
