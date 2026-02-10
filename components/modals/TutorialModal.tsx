// components/modals/TutorialModal.tsx
'use client';

import { useState } from 'react';
import Logo from '@/components/ui/Logo';

type TutorialModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

// ─── Slide data ─────────────────────────────────────────────────────────────

const slides = [
  {
    title: 'Welcome to FamilyCanvas',
    subtitle: "Let's walk through the basics — it only takes a minute.",
    icon: (
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
        <Logo size="md" />
      </div>
    ),
    body: 'FamilyCanvas helps you document your family across countries, cultures, and generations — quickly and visually. No genealogy research required.',
  },
  {
    title: 'Family Lines',
    subtitle: 'Each tree represents one family line.',
    icon: (
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
        <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
        </svg>
      </div>
    ),
    body: 'Use the tree selector in the top bar to create and switch between separate family lines — one for your side, one for your spouse\'s, or one for each grandparent. You can name them however you like.',
  },
  {
    title: 'Building Your Tree',
    subtitle: 'Adding family members is fast.',
    icon: (
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
        <svg className="h-8 w-8 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
        </svg>
      </div>
    ),
    body: 'Click any person on the canvas to select them, then use the quick-add buttons to add a partner, child, parent, or sibling. The tree auto-arranges so you don\'t have to worry about layout.',
  },
  {
    title: 'Partner Statuses',
    subtitle: 'Life is complicated — your tree can reflect that.',
    icon: (
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
        <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
      </div>
    ),
    body: 'Partners can be set to current, divorced, or separated. Click a person, then in the details panel find their partner and use the status dropdown to change it. You can also add multiple past and present partners.',
  },
  {
    title: 'Search & Navigate',
    subtitle: 'Find anyone across all your family lines.',
    icon: (
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100">
        <svg className="h-8 w-8 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
      </div>
    ),
    body: 'Use the search bar to find anyone by name — even across different family lines. You can also collapse and expand branches to focus on specific parts of a large tree, and pinch or scroll to zoom.',
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slide = slides[currentSlide];
  const isFirst = currentSlide === 0;
  const isLast = currentSlide === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      setCurrentSlide(0);
      onClose();
    } else {
      setCurrentSlide((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) setCurrentSlide((s) => s - 1);
  };

  const handleSkip = () => {
    setCurrentSlide(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Modal — bottom sheet on mobile, centered on desktop */}
      <div className="relative w-full rounded-t-2xl bg-white shadow-2xl sm:mx-4 sm:max-w-md sm:rounded-2xl">
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="h-1 w-8 rounded-full bg-gray-300" />
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute right-3 top-3 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="Skip tutorial"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="px-6 pb-4 pt-6 sm:px-8 sm:pt-8">
          {/* Icon */}
          <div className="mb-4 flex justify-center sm:mb-5">{slide.icon}</div>

          {/* Title */}
          <h2
            className="text-center text-xl font-semibold text-gray-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {slide.title}
          </h2>

          {/* Subtitle */}
          <p className="mt-1 text-center text-sm text-gray-500">{slide.subtitle}</p>

          {/* Body */}
          <p className="mt-4 text-center text-sm leading-relaxed text-gray-600">
            {slide.body}
          </p>
        </div>

        {/* Footer: dots + navigation */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
          {/* Back button */}
          <button
            onClick={handleBack}
            disabled={isFirst}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 disabled:invisible"
          >
            Back
          </button>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-2 rounded-full transition-all ${
                  i === currentSlide
                    ? 'w-5 bg-emerald-500'
                    : 'w-2 bg-gray-200 hover:bg-gray-300'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Next / Get Started button */}
          <button
            onClick={handleNext}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            {isLast ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
