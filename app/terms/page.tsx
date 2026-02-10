// app/terms/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/Logo';

export default function TermsPage() {
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
              Terms of Service
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10">
          <p className="text-xs text-gray-400 mb-8">Last updated: February 2026</p>

          <Section title="Agreement to Terms">
            <P>By accessing or using FamilyCanvas (&ldquo;the Service&rdquo;) at familycanvas.app, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</P>
          </Section>

          <Section title="Description of Service">
            <P>FamilyCanvas is a web-based visual family tree builder that allows you to create, edit, share, and export family tree diagrams. The Service is provided on a freemium basis — core features are free, with optional one-time purchases available for additional capacity.</P>
          </Section>

          <Section title="Account Registration">
            <P>To use FamilyCanvas, you must create an account using a valid email address or a supported third-party login (Google). You are responsible for maintaining the security of your account credentials. You must be at least 13 years old to create an account.</P>
            <P>You agree to provide accurate information during registration and to keep your account information up to date.</P>
          </Section>

          <Section title="Your Data & Content">
            <P><strong>You own your data.</strong> All family tree content you create — including names, dates, photos, notes, and relationships — belongs to you. We do not claim any ownership or intellectual property rights over your content.</P>
            <P>By using the Service, you grant us a limited license to store, display, and process your content solely for the purpose of providing the Service to you. This license ends when you delete your content or your account.</P>
            <P>You are responsible for the content you add to your trees. You represent that you have the right to use any photos or information you upload, and that your content does not violate the rights of any third party.</P>
          </Section>

          <Section title="Acceptable Use">
            <P>You agree not to use FamilyCanvas to:</P>
            <P>Store or share content that is illegal, abusive, harassing, threatening, or otherwise objectionable. Violate the privacy rights of others by adding their personal information without appropriate consent. Attempt to gain unauthorized access to any part of the Service, other users&rsquo; accounts, or our systems. Use automated scripts, bots, or scrapers to access the Service. Resell, redistribute, or commercially exploit the Service without our written permission.</P>
          </Section>

          <Section title="Free Tier & Purchases">
            <P><strong>Free tier:</strong> FamilyCanvas offers a free tier that includes up to 2 family canvases and a base number of people (leaves) per account. These limits may change over time.</P>
            <P><strong>One-time purchases:</strong> You can purchase additional leaves and canvases through the Service. All purchases are processed by Stripe and are one-time, non-recurring charges. Purchased capacity is added permanently to your account.</P>
            <P><strong>Refunds:</strong> Refund requests are handled on a case-by-case basis. Contact support@familycanvas.app for refund inquiries. We aim to be fair and reasonable.</P>
          </Section>

          <Section title="Privacy">
            <P>Your privacy is important to us. Our use of your personal information is governed by our <a href="/privacy" className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">Privacy Policy</a>, which is incorporated into these Terms by reference.</P>
          </Section>

          <Section title="Sharing & Visibility">
            <P>All family trees are private by default. If you generate a shareable link, anyone with that link can view your tree in read-only mode. You are responsible for who you share your link with. You can revoke share links at any time.</P>
          </Section>

          <Section title="Intellectual Property">
            <P>The FamilyCanvas service, including its design, code, branding, and documentation, is the intellectual property of FamilyCanvas and is protected by applicable intellectual property laws. You may not copy, modify, distribute, or reverse engineer any part of the Service.</P>
            <P>Your family tree content remains your property as described in &ldquo;Your Data & Content&rdquo; above.</P>
          </Section>

          <Section title="Service Availability">
            <P>We strive to keep FamilyCanvas available at all times but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control. We are not liable for any downtime or data loss resulting from service interruptions.</P>
          </Section>

          <Section title="Account Termination">
            <P>You may delete your account at any time. When you delete your account, all associated data (trees, people, photos, relationships) will be permanently deleted.</P>
            <P>We reserve the right to suspend or terminate accounts that violate these Terms or that are used for abusive purposes. We will attempt to notify you before taking such action, except in cases of severe or urgent violations.</P>
          </Section>

          <Section title="Limitation of Liability">
            <P>FamilyCanvas is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, express or implied. We do not warrant that the Service will be error-free, secure, or uninterrupted.</P>
            <P>To the maximum extent permitted by law, FamilyCanvas shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability shall not exceed the amount you have paid to us in the 12 months preceding the claim.</P>
          </Section>

          <Section title="Changes to Terms">
            <P>We may update these Terms from time to time. We will notify users of significant changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance of the updated Terms. The &ldquo;Last updated&rdquo; date at the top reflects the most recent revision.</P>
          </Section>

          <Section title="Governing Law">
            <P>These Terms are governed by and construed in accordance with the laws of the United States. Any disputes arising from these Terms or the Service shall be resolved through good-faith negotiation first, and if unresolved, through binding arbitration.</P>
          </Section>

          <Section title="Contact">
            <P>If you have questions about these Terms of Service, contact us at <a href="mailto:support@familycanvas.app" className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">support@familycanvas.app</a>.</P>
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
