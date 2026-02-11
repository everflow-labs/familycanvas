// components/modals/ShareModal.tsx
'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import {
  getShareLink,
  createShareLink,
  deleteShareLink,
  getShareUrl,
  type ShareLink,
} from '@/lib/api/share';

type ShareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  treeId: string;
  treeName: string;
};

export default function ShareModal({ isOpen, onClose, treeId, treeName }: ShareModalProps) {
  const [link, setLink] = useState<ShareLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch existing link when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setCopied(false);
    getShareLink(treeId)
      .then((existing) => setLink(existing))
      .finally(() => setLoading(false));
  }, [isOpen, treeId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const newLink = await createShareLink(treeId);
      setLink(newLink);
    } catch (err) {
      console.error('Failed to generate share link:', err);
      alert('Failed to generate link. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    const url = getShareUrl(link.token);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async () => {
    if (!link) return;
    const confirmed = window.confirm(
      'Remove this share link? Anyone with the link will no longer be able to view your tree.'
    );
    if (!confirmed) return;

    try {
      await deleteShareLink(link.id);
      setLink(null);
    } catch (err) {
      console.error('Failed to delete share link:', err);
      alert('Failed to remove link. Please try again.');
    }
  };

  const shareUrl = link ? getShareUrl(link.token) : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${treeName}"`}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Generate a link to share a view-only version of your family tree. Anyone with the link can
          see your tree but cannot make changes.
        </p>

        {loading ? (
          <div className="py-4 text-center text-sm text-gray-500">Checking for existing link...</div>
        ) : link ? (
          <>
            {/* Link display + copy */}
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent text-sm text-gray-700 outline-none truncate"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopy}
                className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  copied
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Share buttons */}
            <div className="flex items-center gap-2">
              {/* Native share (mobile) */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={async () => {
                    try {
                      await navigator.share({
                        title: `${treeName} — Family Tree`,
                        text: `Check out my family tree on FamilyCanvas!`,
                        url: shareUrl,
                      });
                    } catch {
                      // User cancelled or not supported
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
                  </svg>
                  Share
                </button>
              )}

              {/* WhatsApp */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Check out my family tree on FamilyCanvas!\n${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>

              {/* Email */}
              <a
                href={`mailto:?subject=${encodeURIComponent(`${treeName} — Family Tree`)}&body=${encodeURIComponent(`Check out my family tree on FamilyCanvas!\n\n${shareUrl}`)}`}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                Email
              </a>

              {/* SMS/iMessage */}
              <a
                href={`sms:?&body=${encodeURIComponent(`Check out my family tree! ${shareUrl}`)}`}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
                Message
              </a>
            </div>

            {/* Created info */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>
                Created {new Date(link.created_at).toLocaleDateString()}
              </span>
              <button
                onClick={handleDelete}
                className="text-red-500 hover:text-red-700 hover:underline"
              >
                Remove link
              </button>
            </div>
          </>
        ) : (
          /* No link yet - show generate button */
          <div className="py-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate share link'}
            </button>
          </div>
        )}

        {/* Close */}
        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
