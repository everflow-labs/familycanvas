// components/auth/ProfileSetup.tsx
'use client';

import { useState } from 'react';
import PhotoUpload from '@/components/forms/PhotoUpload';

const MOTIVATION_OPTIONS = [
  { value: 'tracking_family', label: 'Keeping track of extended family' },
  { value: 'preserving_knowledge', label: 'Preserving family knowledge for future generations' },
  { value: 'recording_stories', label: 'Recording stories from aging relatives' },
  { value: 'reunion_planning', label: 'Planning a family reunion or event' },
  { value: 'curious', label: 'Just curious / exploring' },
  { value: 'other', label: 'Other' },
];

type ProfileSetupProps = {
  initialName: string;
  onComplete: (data: {
    full_name: string;
    photo_url: string | null;
    motivation: string | null;
    family_origin: string | null;
  }) => Promise<void>;
  onSkip: () => Promise<void>;
};

export default function ProfileSetup({ initialName, onComplete, onSkip }: ProfileSetupProps) {
  const [name, setName] = useState(initialName);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [motivation, setMotivation] = useState<string | null>(null);
  const [familyOrigin, setFamilyOrigin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await onComplete({
        full_name: name.trim(),
        photo_url: photoUrl,
        motivation,
        family_origin: familyOrigin.trim() || null,
      });
    } catch (err) {
      console.error('Profile setup error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setSubmitting(true);
    try {
      await onSkip();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-3">
            <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>Welcome to FamilyCanvas</h2>
          <p className="mt-1 text-sm text-gray-500">Tell us a bit about yourself to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-gray-400">This is how you&apos;ll appear in the app.</p>
          </div>

          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile photo</label>
            <PhotoUpload
              currentPhotoUrl={photoUrl}
              onPhotoChange={setPhotoUrl}
            />
          </div>

          {/* Motivation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What brings you here?
            </label>
            <select
              value={motivation || ''}
              onChange={(e) => setMotivation(e.target.value || null)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Select an option (optional)</option>
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
            <p className="mt-1 text-xs text-gray-400">
              Helps us understand our community. Totally optional.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleSkip}
              disabled={submitting}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
