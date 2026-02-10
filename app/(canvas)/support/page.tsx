// app/(canvas)/support/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

type FAQItem = {
  question: string;
  answer: string;
  category: 'tree' | 'people' | 'relationships' | 'account' | 'privacy';
};

const FAQ_ITEMS: FAQItem[] = [
  // ─── Tree & Navigation ───
  {
    category: 'tree',
    question: 'How do I navigate a large family tree?',
    answer: 'Use pinch-to-zoom on mobile or scroll wheel on desktop to zoom in and out. Drag on any empty area to pan around. You can also use the collapse/expand buttons on person nodes to hide entire branches and focus on specific family lines. On mobile, the controls in the bottom-left corner also let you zoom and fit the tree to your screen.',
  },
  {
    category: 'tree',
    question: 'How do I export my family tree?',
    answer: 'Tap the Export button in the top bar (or the Tools menu on mobile). Your tree will be downloaded as a PDF that reflects your current view — if you\'ve collapsed any branches, only the visible portion will be exported. This makes it easy to create focused exports of specific family lines.',
  },
  {
    category: 'tree',
    question: 'Can I have more than one family tree?',
    answer: 'Yes! On the free plan you can create up to 2 family lines (e.g., one for your paternal side and one for your maternal side). Use the tree selector dropdown in the top-left of the canvas to switch between them. Additional family lines will be available with a premium plan in the future.',
  },
  {
    category: 'tree',
    question: 'How do I share my tree with family members?',
    answer: 'Tap the Share button in the top bar to generate a shareable link. Anyone with the link can view your tree in read-only mode — they won\'t be able to edit it. You can revoke access at any time by disabling the share link.',
  },

  // ─── Adding & Editing People ───
  {
    category: 'people',
    question: 'Why can\'t I add a parent to this person?',
    answer: 'Parents can only be added to people who are on the bloodline (the direct family line). Partners who married into the family are not on the bloodline, so you can\'t add parents to them — this keeps the tree structure clean and avoids merging separate family lines. If you need to document a partner\'s family, consider creating a separate family line for their side.',
  },
  {
    category: 'people',
    question: 'Why can\'t I add a sibling?',
    answer: 'A sibling can only be added to someone who already has at least one parent in the tree. This is because siblings share a parent — so the tree needs to know which parent to connect them to. Add a parent first, then you\'ll be able to add siblings.',
  },
  {
    category: 'people',
    question: 'Why can\'t I add more people to my tree?',
    answer: 'The free plan includes up to 100 leaves (people) per family line. If you\'ve reached this limit, you\'ll see a message letting you know. A premium plan with expanded capacity will be available in the future. For now, you can create a second family line if you haven\'t already.',
  },
  {
    category: 'people',
    question: 'How do I mark someone as deceased?',
    answer: 'Tap on the person to open their details panel, then tap the Edit button. In the edit form, you\'ll find a "Deceased" toggle. When enabled, you can optionally add a date of death. Deceased members are shown with a memorial icon and a muted border on the canvas.',
  },
  {
    category: 'people',
    question: 'How do I delete someone from the tree?',
    answer: 'Tap the person to open their details panel, scroll to the bottom, and tap "Delete this person." You\'ll be asked to confirm. Note: if this person is a parent with children in the tree, deleting them will disconnect those children. Consider whether you want to reassign children to another parent first.',
  },
  {
    category: 'people',
    question: 'How do I add a photo?',
    answer: 'Tap the person, then tap Edit. You\'ll see a photo upload area at the top of the form. Tap it to select a photo from your device. Photos are automatically cropped to fit the circular display on the node. You can change or remove the photo at any time by editing the person again.',
  },

  // ─── Relationships ───
  {
    category: 'relationships',
    question: 'How do I record that a couple is divorced?',
    answer: 'Tap on either partner to open their details panel. In the relationships section, you\'ll see the partnership listed with a status indicator. Tap the status to change it from "Current" to "Divorced" or "Separated." Divorced partners are shown with a dashed connector line on the canvas.',
  },
  {
    category: 'relationships',
    question: 'Can I add a new partner after a divorce?',
    answer: 'Yes. Once you\'ve changed the previous partner\'s status to "Divorced" or "Separated," the option to add a new partner becomes available again. Each person can only have one current partner at a time, but there\'s no limit on the number of past partnerships recorded.',
  },
  {
    category: 'relationships',
    question: 'How do I indicate that a child is adopted?',
    answer: 'When adding or editing a person, toggle the "Adopted" option. Adopted children display a small heart icon on their node. The tree structure treats them identically to biological children — adoption is a visual indicator only and doesn\'t affect how relationships work.',
  },
  {
    category: 'relationships',
    question: 'Can I change who a person\'s parent is?',
    answer: 'Yes. In the person\'s details panel, look for the "Change parent" option under their listed parent. This lets you reassign them to a different person in the tree. This is useful if you made a mistake during entry or if family circumstances change.',
  },

  // ─── Account ───
  {
    category: 'account',
    question: 'How do I change my display name or email?',
    answer: 'Go to Account Settings from the menu in the top-right corner. You can update your display name and profile photo there. Email changes are not currently supported — if you need to change your email, please contact support.',
  },
  {
    category: 'account',
    question: 'How do I delete my account and all my data?',
    answer: 'Contact us at the email below and we will permanently delete your account and all associated data within 48 hours. We take data deletion seriously — once deleted, your information cannot be recovered.',
  },

  // ─── Privacy & Data ───
  {
    category: 'privacy',
    question: 'Will my family data ever be sold or shared with third parties?',
    answer: 'No. Absolutely not — not now, not ever. Your family information is deeply personal and we treat it that way. We will never sell, share, license, or otherwise provide your data to any third party. Our business model is built on subscriptions, not data monetization. This is a core principle, not a marketing claim.',
  },
  {
    category: 'privacy',
    question: 'Who can see my family tree?',
    answer: 'By default, your tree is completely private — only you can see it. If you generate a share link, anyone with that specific link can view your tree in read-only mode. You can revoke share access at any time. We do not make any trees publicly discoverable or searchable.',
  },
  {
    category: 'privacy',
    question: 'Is my data encrypted?',
    answer: 'All data is transmitted over HTTPS (encrypted in transit) and stored in a secured database with access controls. Photos are stored in encrypted cloud storage. We follow industry-standard security practices to protect your information.',
  },
  {
    category: 'privacy',
    question: 'Can I export all my data?',
    answer: 'Yes. You can export your family tree as a PDF at any time using the Export button. We believe you own your data and should always be able to take it with you. Full data export in additional formats may be available in a future update.',
  },
];

const CATEGORIES: { key: FAQItem['category']; label: string; icon: string }[] = [
  { key: 'tree', label: 'Tree & Navigation', icon: '🌳' },
  { key: 'people', label: 'Adding & Editing People', icon: '👤' },
  { key: 'relationships', label: 'Relationships', icon: '💞' },
  { key: 'account', label: 'Account', icon: '⚙️' },
  { key: 'privacy', label: 'Privacy & Data', icon: '🔒' },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-3 py-4 text-left group min-h-[44px]"
      >
        <svg
          className={`h-4 w-4 mt-0.5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
            open ? 'rotate-90' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-sm font-medium text-gray-900 group-hover:text-emerald-700 transition-colors">
          {item.question}
        </span>
      </button>
      {open && (
        <div className="pb-4 pl-7 pr-2">
          <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<FAQItem['category'] | 'all'>('all');

  const filteredFAQ = activeCategory === 'all'
    ? FAQ_ITEMS
    : FAQ_ITEMS.filter((item) => item.category === activeCategory);

  return (
    <ProtectedRoute>
      <div
        className="fc-app min-h-screen"
        style={{ background: 'linear-gradient(160deg, #f0faf4 0%, #f7f9f6 30%, #faf8f2 60%, #f5f0eb 100%)' }}
      >
        {/* Header - branded dark gradient (matches settings) */}
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
                Help & Support
              </h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">

          {/* ─── Contact Section ─── */}
          <section className="rounded-xl border border-gray-200/80 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-900">Contact Us</h2>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Have a question, found a bug, or just want to say hi? We&apos;d love to hear from you. Our small team reads every message and typically responds within 24 hours.
            </p>

            <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/60 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Email us at</p>
                  <a
                    href="mailto:support@familycanvas.app"
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-600 transition-colors"
                  >
                    support@familycanvas.app
                  </a>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-400">
              For account deletion requests, bug reports, feature suggestions, or any other inquiries.
            </p>
          </section>

          {/* ─── FAQ Section ─── */}
          <section className="mt-6 rounded-xl border border-gray-200/80 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-900">Frequently Asked Questions</h2>
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap gap-2 mb-5 -mx-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={`rounded-full px-3.5 py-2 text-xs font-medium transition-all ${
                  activeCategory === 'all'
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`rounded-full px-3.5 py-2 text-xs font-medium transition-all ${
                    activeCategory === cat.key
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {/* FAQ list */}
            <div>
              {activeCategory === 'all' ? (
                // Grouped by category
                CATEGORIES.map((cat) => {
                  const items = FAQ_ITEMS.filter((f) => f.category === cat.key);
                  return (
                    <div key={cat.key} className="mb-4 last:mb-0">
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-xs">{cat.icon}</span>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{cat.label}</span>
                      </div>
                      <div className="rounded-lg border border-gray-100 bg-white/60 px-4">
                        {items.map((item, i) => (
                          <FAQAccordion key={i} item={item} />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Single category
                <div className="rounded-lg border border-gray-100 bg-white/60 px-4">
                  {filteredFAQ.map((item, i) => (
                    <FAQAccordion key={i} item={item} />
                  ))}
                </div>
              )}
            </div>

            {/* Didn't find answer */}
            <div className="mt-5 rounded-lg bg-gray-50 border border-gray-200/60 p-4 text-center">
              <p className="text-sm text-gray-500 mb-3">
                Didn&apos;t find what you were looking for?
              </p>
              <a
                href="mailto:support@familycanvas.app"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200/60 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                Send us an email
              </a>
            </div>
          </section>

          {/* Bottom safe area for notched phones */}
          <div className="h-8 sm:h-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
        </div>
      </div>
    </ProtectedRoute>
  );
}
