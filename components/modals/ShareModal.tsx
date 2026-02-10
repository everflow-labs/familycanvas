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
