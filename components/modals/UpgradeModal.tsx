// components/modals/UpgradeModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PRODUCTS, type ProductConfig } from '@/lib/stripe/products';

export type UpgradeReason = 'leaf_capacity' | 'multi_tree' | 'premium_feature';

type UpgradeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  reason?: UpgradeReason;
  currentCount?: number;
  limit?: number;
};

const REASON_HEADER: Record<UpgradeReason, { title: string; description: string }> = {
  leaf_capacity: {
    title: 'Need more space?',
    description: "You've reached the limit for people in your tree. Add more leaves or grab a bundle.",
  },
  multi_tree: {
    title: 'Need more canvases?',
    description: "You've used all your available family lines. Grab a pack to add more.",
  },
  premium_feature: {
    title: 'Expand your tree',
    description: 'Add more leaves and canvases to keep documenting your family.',
  },
};

// Which products to show for each reason (ordered by relevance)
function getProductsForReason(reason: UpgradeReason): ProductConfig[] {
  switch (reason) {
    case 'leaf_capacity':
      // Show leaf-only options first, then bundles
      return [
        PRODUCTS.find((p) => p.productType === 'leaves_50')!,
        PRODUCTS.find((p) => p.productType === 'leaves_100')!,
        PRODUCTS.find((p) => p.productType === 'starter_pack')!,
        PRODUCTS.find((p) => p.productType === 'family_pack')!,
      ];
    case 'multi_tree':
      // Show bundles first (they include canvases), then leaf-only as extras
      return [
        PRODUCTS.find((p) => p.productType === 'starter_pack')!,
        PRODUCTS.find((p) => p.productType === 'family_pack')!,
        PRODUCTS.find((p) => p.productType === 'leaves_50')!,
        PRODUCTS.find((p) => p.productType === 'leaves_100')!,
      ];
    case 'premium_feature':
    default:
      return PRODUCTS;
  }
}

export default function UpgradeModal({
  isOpen,
  onClose,
  reason = 'premium_feature',
  currentCount,
  limit,
}: UpgradeModalProps) {
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const header = REASON_HEADER[reason];
  const products = getProductsForReason(reason);

  const handlePurchase = async (product: ProductConfig) => {
    setLoadingProduct(product.priceId);
    setError(null);

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in to continue.');
        setLoadingProduct(null);
        return;
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ priceId: product.priceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Purchase error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setLoadingProduct(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:mx-4 sm:max-w-md sm:rounded-xl" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="h-1 w-8 rounded-full bg-gray-300" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 z-10"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>

          <h3 className="text-center text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            {header.title}
          </h3>

          {/* Capacity bar for leaf_capacity */}
          {reason === 'leaf_capacity' && currentCount !== undefined && limit !== undefined && (
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
              <div className="flex items-center justify-between text-xs text-amber-700 mb-1.5">
                <span>Leaves used</span>
                <span className="font-medium">{currentCount} / {limit}</span>
              </div>
              <div className="h-1.5 rounded-full bg-amber-200">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${Math.min(100, (currentCount / limit) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <p className="mt-2 text-center text-sm text-gray-500">{header.description}</p>
        </div>

        {/* Product options */}
        <div className="px-6 py-4 space-y-2.5">
          {products.map((product) => {
            const isBundle = product.treesAdded > 0;
            const isLoading = loadingProduct === product.priceId;
            const isDisabled = loadingProduct !== null;

            // For multi_tree reason, dim leaf-only products
            const isDimmed = reason === 'multi_tree' && product.treesAdded === 0;

            return (
              <button
                key={product.priceId}
                onClick={() => handlePurchase(product)}
                disabled={isDisabled}
                className={`relative w-full rounded-xl border p-4 text-left transition-all ${
                  isLoading
                    ? 'border-emerald-300 bg-emerald-50'
                    : isDimmed
                      ? 'border-gray-100 bg-gray-50/50 opacity-60 hover:opacity-80'
                      : isBundle
                        ? 'border-emerald-200 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 hover:border-emerald-300 hover:shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                } ${isDisabled && !isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {/* Badge */}
                {product.badge && (
                  <span className="absolute -top-2 right-3 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">
                    {product.badge}
                  </span>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{product.name}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{product.description}</p>

                    {/* What's included — for bundles */}
                    {isBundle && (
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-100/80 rounded-full px-2 py-0.5">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          {product.treesAdded} {product.treesAdded === 1 ? 'canvas' : 'canvases'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-100/80 rounded-full px-2 py-0.5">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
                          </svg>
                          {product.leavesAdded} leaves
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex-shrink-0 ml-4 text-right">
                    {isLoading ? (
                      <div className="h-5 w-5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                    ) : (
                      <span className={`text-lg font-bold ${isBundle ? 'text-emerald-700' : 'text-gray-900'}`}>
                        ${product.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="text-center text-[11px] text-gray-400 leading-relaxed">
            One-time purchase. Secure payment via Stripe. Your data is never shared.
          </p>
        </div>
      </div>
    </div>
  );
}
