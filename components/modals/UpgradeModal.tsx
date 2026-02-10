// components/modals/UpgradeModal.tsx
'use client';

type UpgradeReason = 'leaf_capacity' | 'multi_tree' | 'premium_feature';

type UpgradeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  reason?: UpgradeReason;
  currentCount?: number;
  limit?: number;
};

const REASON_CONTENT: Record<UpgradeReason, { title: string; description: string; features: string[] }> = {
  leaf_capacity: {
    title: 'Tree capacity reached',
    description: "You've reached the maximum number of people on your free plan. Upgrade to add unlimited family members.",
    features: [
      'Unlimited people per tree',
      'Multiple trees',
      'Custom fields (clan, village, tribe, etc.)',
      'Advanced search & filters',
      'Premium export templates',
    ],
  },
  multi_tree: {
    title: 'Multiple trees',
    description: 'Free accounts include one tree. Upgrade to create separate trees for different family branches.',
    features: [
      'Unlimited trees',
      'Tree merging (link people across trees)',
      'Collaboration (invite family editors)',
      'Unlimited people per tree',
      'Premium export templates',
    ],
  },
  premium_feature: {
    title: 'Premium feature',
    description: 'This feature is available on the premium plan. Upgrade to unlock all FamilyCanvas features.',
    features: [
      'Unlimited trees & people',
      'Custom fields',
      'Collaboration',
      'Advanced views (map, timeline, calendar)',
      'Premium export templates',
    ],
  },
};

export default function UpgradeModal({
  isOpen,
  onClose,
  reason = 'premium_feature',
  currentCount,
  limit,
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const content = REASON_CONTENT[reason];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal — bottom sheet on mobile, centered on desktop */}
      <div className="relative w-full max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:mx-4 sm:max-w-md sm:rounded-2xl" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="h-1 w-8 rounded-full bg-gray-300" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100">
            <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
          </div>

          <h3 className="text-center text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>{content.title}</h3>

          {/* Capacity bar for leaf_capacity */}
          {reason === 'leaf_capacity' && currentCount !== undefined && limit !== undefined && (
            <div className="mt-3 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
              <div className="flex items-center justify-between text-xs text-red-700 mb-1.5">
                <span>Leaves used</span>
                <span className="font-medium">{currentCount} / {limit}</span>
              </div>
              <div className="h-1.5 rounded-full bg-red-200">
                <div
                  className="h-full rounded-full bg-red-500 transition-all"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          <p className="mt-3 text-center text-sm text-gray-500">{content.description}</p>
        </div>

        {/* Features */}
        <div className="border-t border-gray-100 px-6 py-4">
          <p className="text-xs font-medium text-gray-700 mb-2">Premium includes:</p>
          <ul className="space-y-2">
            {content.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="border-t border-gray-100 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            disabled
            className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-medium text-white opacity-60 cursor-not-allowed"
          >
            Coming soon
          </button>
          <p className="mt-2 text-center text-xs text-gray-400">
            Premium plans are coming soon. Stay tuned!
          </p>
        </div>
      </div>
    </div>
  );
}

export type { UpgradeReason };
