// app/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/components/auth/AuthProvider';
import PhotoUpload from '@/components/forms/PhotoUpload';
import { getProfile, updateProfile, type Profile } from '@/lib/api/profiles';
import { supabase } from '@/lib/supabase/client';
import UpgradeModal, { type UpgradeReason } from '@/components/modals/UpgradeModal';

const MOTIVATION_OPTIONS = [
  { value: 'tracking_family', label: 'Keeping track of extended family' },
  { value: 'preserving_knowledge', label: 'Preserving family knowledge for future generations' },
  { value: 'recording_stories', label: 'Recording stories from aging relatives' },
  { value: 'reunion_planning', label: 'Planning a family reunion or event' },
  { value: 'curious', label: 'Just curious / exploring' },
  { value: 'other', label: 'Other' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [motivation, setMotivation] = useState<string | null>(null);
  const [familyOrigin, setFamilyOrigin] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason>('premium_feature');

  useEffect(() => {
    async function load() {
      const p = await getProfile();
      if (p) {
        setProfile(p);
        setName(p.full_name || '');
        setPhotoUrl(p.photo_url);
        setMotivation(p.motivation);
        setFamilyOrigin(p.family_origin || '');
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await updateProfile({
        full_name: name.trim() || null,
        photo_url: photoUrl,
        motivation,
        family_origin: familyOrigin.trim() || null,
      });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save profile:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This will permanently delete all your trees, people, and data. This cannot be undone.'
    );
    if (!confirmed) return;

    const doubleConfirmed = window.confirm(
      'This is your last chance. All data will be permanently deleted. Continue?'
    );
    if (!doubleConfirmed) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You must be logged in to delete your account.');
        return;
      }

      const res = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || 'Failed to delete account. Please contact support.');
        return;
      }

      // Sign out locally and redirect to landing page
      await signOut();
      router.push('/');
    } catch (err) {
      console.error('Delete account error:', err);
      alert('An unexpected error occurred. Please contact support.');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ background: 'linear-gradient(160deg, #f0faf4 0%, #f7f9f6 30%, #faf8f2 60%, #f5f0eb 100%)' }}
        >
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div
        className="fc-app min-h-screen"
        style={{ background: 'linear-gradient(160deg, #f0faf4 0%, #f7f9f6 30%, #faf8f2 60%, #f5f0eb 100%)' }}
      >
        {/* Header - branded dark gradient */}
        <div
          style={{ background: 'linear-gradient(135deg, #121e19 0%, #1a2f27 50%, #064e3b 100%)' }}
        >
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/canvas')}
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                Account Settings
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {saved && (
                <span className="text-sm text-emerald-300">Saved!</span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 transition-all shadow-md shadow-emerald-900/30"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          {/* Profile section */}
          <section className="rounded-xl border border-gray-200/80 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-900">Profile</h2>
            </div>

            <div className="space-y-5">
              {/* Photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                <PhotoUpload
                  currentPhotoUrl={photoUrl}
                  onPhotoChange={setPhotoUrl}
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Email cannot be changed here.
                </p>
              </div>

              {/* Motivation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What brings you to FamilyCanvas?
                </label>
                <select
                  value={motivation || ''}
                  onChange={(e) => setMotivation(e.target.value || null)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Not specified</option>
                  {MOTIVATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Family origin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Where is your family from?
                </label>
                <input
                  type="text"
                  value={familyOrigin}
                  onChange={(e) => setFamilyOrigin(e.target.value)}
                  placeholder="e.g., Lebanon, Nigeria, Korea, Mexico..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </section>

          {/* Plan section */}
          <section className="mt-6 rounded-xl border border-gray-200/80 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-900">Plan</h2>
            </div>

            {/* Current plan badge */}
            <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/60 p-4 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  FREE PLAN
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Includes {profile?.tree_limit ?? 2} family lines and up to {profile?.leaf_capacity ?? 100} leaves per line.
              </p>
            </div>

            {/* Upgrade options */}
            <div className="space-y-3">
              {/* More family lines */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">More family lines</div>
                    <div className="text-xs text-gray-500">Add additional canvases beyond the included {profile?.tree_limit ?? 2}</div>
                  </div>
                </div>
                <button
                  onClick={() => { setUpgradeReason('multi_tree'); setUpgradeOpen(true); }}
                  className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  Add more
                </button>
              </div>

              {/* More leaves */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                    <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">More leaves</div>
                    <div className="text-xs text-gray-500">Expand beyond {profile?.leaf_capacity ?? 100} people per family line</div>
                  </div>
                </div>
                <button
                  onClick={() => { setUpgradeReason('leaf_capacity'); setUpgradeOpen(true); }}
                  className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  Add more
                </button>
              </div>

              {/* Premium features */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Premium features</div>
                    <div className="text-xs text-gray-500">Collaboration, custom fields, advanced exports, and more</div>
                  </div>
                </div>
                <button
                  disabled
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400 cursor-not-allowed"
                >
                  Coming soon
                </button>
              </div>
            </div>
          </section>

          {/* Account actions — red border, no header */}
          <section className="mt-6 rounded-xl border border-red-200/80 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">Log out</div>
                <div className="text-xs text-gray-500 mt-0.5">Sign out of your account on this device.</div>
              </div>
              <button
                onClick={() => signOut()}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Log out
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-red-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">Delete account</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Permanently delete your account and all data.
                </div>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Delete account
              </button>
            </div>
          </section>
        </div>
      </div>

      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />
    </ProtectedRoute>
  );
}
