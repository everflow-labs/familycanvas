// components/ui/Modal.tsx
'use client';

import { useEffect, useRef } from 'react';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  width?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
};

const widthClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
};

export default function Modal({ isOpen, onClose, title, width = 'md', children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
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

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Modal panel */}
      <div
        className={`
          relative w-full ${widthClasses[width]}
          bg-white shadow-xl
          /* Mobile: bottom sheet style - full width, rounded top */
          rounded-t-2xl sm:rounded-xl
          /* Height constraints */
          max-h-[92vh] sm:max-h-[85vh]
          /* Flex column so header stays fixed, content scrolls */
          flex flex-col
          /* Animation */
          animate-in sm:fade-in-0 slide-in-from-bottom-4 sm:slide-in-from-bottom-2 duration-200
        `}
      >
        {/* Header - sticky at top */}
        {title && (
          <div className="flex items-center justify-between border-b px-5 py-4 flex-shrink-0">
            {/* Mobile drag handle */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 sm:hidden">
              <div className="h-1 w-8 rounded-full bg-gray-300" />
            </div>
            <h2
              className="text-base font-semibold text-gray-900"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
