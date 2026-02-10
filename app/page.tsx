// app/page.tsx — Landing page
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import Logo from '@/components/ui/Logo';
import dynamic from 'next/dynamic';

const ParticleHero = dynamic(() => import('@/components/landing/ParticleHero'), {
  ssr: false,
});

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: '30 Seconds to Add',
    description: 'Quick-add anyone with a tap. No research forms, no required fields. Just name, photo, done.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    title: 'Built for Global Families',
    description: 'Native script names, any naming convention, any country. Your culture, your way.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
    title: 'Every Family Welcome',
    description: 'All structures supported. Same-sex couples, blended families, adoptive parents, non-binary — everyone belongs.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
    title: 'Visual Canvas',
    description: 'An interactive canvas you can zoom, pan, collapse, and export as a PDF. Built for sharing with family.',
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect logged-in users to canvas
  useEffect(() => {
    if (!loading && user) {
      router.push('/canvas');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="min-h-screen fc-bg-dark flex items-center justify-center">
        <div className="animate-pulse text-emerald-400/60 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen fc-bg-dark text-white overflow-x-hidden" style={{ fontFamily: 'var(--font-body)' }}>
      {/* ===== NAV ===== */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-lg font-semibold tracking-tight">FamilyCanvas</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-white/70 hover:text-white transition-colors px-3 py-1.5"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium bg-white/10 hover:bg-white/15 border border-white/15 hover:border-white/25 rounded-lg px-4 py-1.5 transition-all"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        {/* Particle background */}
        <div className="absolute inset-0">
          <ParticleHero />
        </div>

        {/* Radial gradient overlay to focus content */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 20%, rgba(10, 15, 13, 0.7) 70%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 text-center max-w-3xl mx-auto px-6">
          <h1
            className={`text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.1] tracking-tight transition-all duration-700 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ fontFamily: 'var(--font-display)', transitionDelay: '200ms' }}
          >
            Your family story,{' '}
            <span className="fc-text-gradient-warm">finally mapped</span>
          </h1>

          <p
            className={`mt-6 text-lg sm:text-xl text-white/60 max-w-xl mx-auto leading-relaxed transition-all duration-700 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            A simple, visual family tree for real families — wherever they are.{' '}
            Capture living relationships across countries, cultures, and generations.
          </p>

          <div
            className={`mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '600ms' }}
          >
            <Link
              href="/signup"
              className="fc-btn-primary text-base px-8 py-3 rounded-xl shadow-lg hover:shadow-xl inline-flex items-center gap-2"
            >
              Start your tree — free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <span className="text-sm text-white/40">No credit card required</span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-700 ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: '1000ms', animation: 'fc-float 3s ease-in-out infinite' }}
        >
          <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">
              Why FamilyCanvas
            </p>
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Built for how families{' '}
              <span className="fc-text-gradient">actually</span> work
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="fc-glass rounded-2xl p-6 group hover:bg-white/[0.07] transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRIVACY COMMITMENT ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="fc-glass rounded-3xl p-8 sm:p-12 relative overflow-hidden">
            {/* Subtle shield background accent */}
            <div className="absolute -right-8 -top-8 w-40 h-40 opacity-[0.03]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-white">
                <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08Zm3.094 8.016a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
              </svg>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-12">
              {/* Shield icon */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08Zm3.094 8.016a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {/* Text content */}
              <div className="text-center sm:text-left">
                <h2
                  className="text-2xl sm:text-3xl font-bold tracking-tight mb-3"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Your family data stays yours. Forever.
                </h2>
                <p className="text-sm text-white/50 max-w-lg leading-relaxed mb-4">
                  Family information is deeply personal. We will <span className="text-white/80 font-medium">never</span> sell, share, or monetize your data — not today, not ever. No data brokers, no third-party sharing, no exceptions.
                </p>
                <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                  {[
                    { icon: '🔒', text: 'Private by default' },
                    { icon: '🚫', text: 'No data selling — ever' },
                    { icon: '🗑️', text: 'Delete anytime, completely' },
                  ].map((item, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1.5 bg-white/[0.04] border border-white/10 rounded-full px-3 py-1.5 text-xs text-white/60"
                    >
                      <span>{item.icon}</span>
                      {item.text}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TRIGGER MOMENTS ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">
            Real moments
          </p>
          <h2
            className="text-2xl sm:text-3xl font-bold tracking-tight mb-12"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Built for the moments that matter
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 text-left">
            {[
              { emoji: '📱', text: 'WhatsApp message: "Cousin Sara had a baby!"' },
              { emoji: '✈️', text: "Family visit where everyone shares updates" },
              { emoji: '🎉', text: "Planning a reunion and realizing you've lost track" },
              { emoji: '💭', text: "Preserving family knowledge before it's lost" },
            ].map((m, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] transition-colors duration-200"
              >
                <span className="text-xl mt-0.5">{m.emoji}</span>
                <p className="text-sm text-white/60 leading-relaxed">{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Start mapping your family today
          </h2>
          <p className="text-white/50 mb-8 max-w-md mx-auto">
            Free to start. No credit card. No research required.
            Just your family, all in one place.
          </p>
          <Link
            href="/signup"
            className="fc-btn-primary text-base px-8 py-3 rounded-xl inline-flex items-center gap-2"
          >
            Create your free tree
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-white/40">
            <Logo size="xs" />
            FamilyCanvas
          </div>
          <div className="text-xs text-white/30">
            © {new Date().getFullYear()} FamilyCanvas. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
