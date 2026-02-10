// app/privacy/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/Logo';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div
      className="fc-app min-h-screen"
      style={{ background: 'linear-gradient(160deg, #f0faf4 0%, #f7f9f6 30%, #faf8f2 60%, #f5f0eb 100%)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-4"
        style={{ background: 'linear-gradient(135deg, #121e19 0%, #1a2f27 50%, #064e3b 100%)' }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 hover:bg-white/15 hover:text-white transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <h1 className="text-lg font-semibold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Privacy Policy
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10">
          <p className="text-xs text-gray-400 mb-8">Last updated: February 2026</p>

          <Section title="Overview">
            <P>FamilyCanvas (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;) is a visual family tree builder available at familycanvas.app. We take the privacy of your family data seriously. This policy explains what data we collect, how we use it, and your rights.</P>
          </Section>

          <Section title="What We Collect">
            <P>When you use FamilyCanvas, we collect:</P>
            <P><strong>Account information:</strong> Your name and email address when you sign up (directly or via Google sign-in).</P>
            <P><strong>Family tree data:</strong> Names, dates, locations, photos, notes, and relationship information you add to your trees. This data is entered by you and stored to provide the service.</P>
            <P><strong>Usage data:</strong> Anonymous page view analytics via Vercel Analytics to understand how the product is used. This does not include personal information or family tree content.</P>
            <P><strong>Payment information:</strong> When you make a purchase, payment is processed by Stripe. We do not store your credit card number or payment details — Stripe handles this securely.</P>
          </Section>

          <Section title="How We Use Your Data">
            <P>We use your data solely to provide and improve FamilyCanvas:</P>
            <P><strong>To provide the service:</strong> Storing your family tree, displaying it to you, enabling sharing and export features.</P>
            <P><strong>To process payments:</strong> Handling purchases for additional leaves and canvases through Stripe.</P>
            <P><strong>To improve the product:</strong> Anonymous usage analytics help us understand which features are used and where users encounter issues.</P>
            <P><strong>To communicate with you:</strong> Responding to support requests you initiate.</P>
          </Section>

          <Section title="What We Will NEVER Do">
            <div className="bg-emerald-50 rounded-xl p-4 sm:p-6 mb-4">
              <P><strong>We will never sell your data.</strong> Not to data brokers, not to advertisers, not to anyone.</P>
              <P><strong>We will never share your family information with third parties</strong> except as required to provide the service (e.g., Supabase for data storage, Stripe for payments).</P>
              <P><strong>We will never use your family data for advertising</strong> or serve ads based on your family information.</P>
              <P className="mb-0"><strong>We will never train AI models on your family data.</strong></P>
            </div>
          </Section>

          <Section title="Data Storage & Security">
            <P>Your data is stored securely in Supabase (PostgreSQL database) with industry-standard encryption. Photos are stored in Supabase Storage. All data is transmitted over HTTPS (encrypted in transit). All trees are private by default — only you can see your tree unless you explicitly create a share link.</P>
          </Section>

          <Section title="Sharing & Visibility">
            <P>Your family trees are <strong>private by default</strong>. No one can see your tree unless:</P>
            <P>You create a shareable link and send it to someone, or a future collaboration feature allows you to invite editors (not yet available). You can revoke share links at any time, instantly removing access.</P>
          </Section>

          <Section title="Third-Party Services">
            <P>We use the following third-party services to operate FamilyCanvas:</P>
            <P><strong>Supabase:</strong> Database, authentication, and file storage. Your data is stored in their cloud infrastructure.</P>
            <P><strong>Vercel:</strong> Web hosting and anonymous analytics.</P>
            <P><strong>Stripe:</strong> Payment processing. Stripe&rsquo;s privacy policy applies to payment data.</P>
            <P><strong>Google:</strong> Sign-in authentication (if you choose to sign in with Google).</P>
            <P>We do not use any advertising, tracking, or data broker services.</P>
          </Section>

          <Section title="Your Rights">
            <P>You have the right to:</P>
            <P><strong>Access your data:</strong> You can view all your family tree data within the app at any time.</P>
            <P><strong>Export your data:</strong> You can export your tree as a PDF.</P>
            <P><strong>Delete your data:</strong> You can delete individual people, entire trees, or your account. When you delete your account, all associated data is permanently removed.</P>
            <P><strong>Correct your data:</strong> You can edit any information in your tree at any time.</P>
          </Section>

          <Section title="Cookies">
            <P>We use essential cookies only — for authentication (keeping you logged in) and session management. We do not use tracking cookies, advertising cookies, or third-party analytics cookies.</P>
          </Section>

          <Section title="Children's Privacy">
            <P>FamilyCanvas is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us and we will delete it.</P>
          </Section>

          <Section title="Changes to This Policy">
            <P>We may update this privacy policy from time to time. We will notify users of significant changes via email or in-app notification. The &ldquo;Last updated&rdquo; date at the top reflects the most recent revision.</P>
          </Section>

          <Section title="Contact">
            <P>If you have questions about this privacy policy or your data, contact us at <a href="mailto:support@familycanvas.app" className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">support@familycanvas.app</a>.</P>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2
        className="text-base font-bold text-gray-900 mb-3"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function P({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm text-gray-600 leading-relaxed mb-3 ${className}`}>{children}</p>;
}
