// app/seo-metadata.ts
// Import this in your root layout.tsx and spread into the metadata export
import type { Metadata } from 'next';

const SITE_URL = 'https://www.familycanvas.app';
const SITE_NAME = 'FamilyCanvas';
const TITLE_DEFAULT = 'FamilyCanvas — Free Family Tree Maker for Modern Families';
const TITLE_TEMPLATE = '%s | FamilyCanvas';
const DESCRIPTION = 'Create a simple, visual family tree in minutes. Add people in seconds, track family across countries and generations, and share with relatives. Free online family tree builder for real families — wherever they are.';

export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: TITLE_DEFAULT,
    template: TITLE_TEMPLATE,
  },

  description: DESCRIPTION,

  keywords: [
    // Primary keywords (highest search volume)
    'family tree maker',
    'family tree builder',
    'family tree creator',
    'free family tree',
    'online family tree',
    'family tree app',
    'family tree maker free',

    // Feature-specific
    'visual family tree',
    'family tree diagram',
    'family tree chart',
    'interactive family tree',
    'family tree template',
    'family tree generator',
    'printable family tree',
    'family tree PDF',
    'family tree export',
    'shareable family tree',

    // Use-case keywords
    'document family relationships',
    'track family across countries',
    'extended family tree',
    'modern family tree',
    'simple family tree maker',
    'easy family tree builder',
    'quick family tree',
    'family tree for large families',
    'family tree multiple countries',

    // Inclusive keywords
    'family tree for blended families',
    'inclusive family tree',
    'international family tree',
    'multicultural family tree',
    'family tree all family types',

    // Action keywords
    'create family tree online free',
    'make family tree',
    'build family tree',
    'share family tree',
    'how to make a family tree',

    // Genealogy adjacent
    'genealogy tool',
    'ancestry chart',
    'family history',
    'family lineage',
    'family connections',
    'family tree software',
  ],

  authors: [{ name: 'FamilyCanvas' }],
  creator: 'FamilyCanvas',
  publisher: 'FamilyCanvas',

  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: TITLE_DEFAULT,
    description: DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'FamilyCanvas — A visual family tree maker for modern families',
        type: 'image/png',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: TITLE_DEFAULT,
    description: DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
    creator: '@familycanvas',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  alternates: {
    canonical: SITE_URL,
  },

  category: 'technology',

  other: {
    'application-name': SITE_NAME,
    'apple-mobile-web-app-title': SITE_NAME,
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'mobile-web-app-capable': 'yes',
    'theme-color': '#059669',
  },
};

// Per-page metadata helpers
export const pageMetadata = {
  landing: {
    title: 'FamilyCanvas — Free Family Tree Maker for Modern Families',
    description: 'Create a simple, visual family tree in minutes. Add people in seconds, track family across countries and generations, and share with relatives. Free for families everywhere.',
  },
  login: {
    title: 'Log In',
    description: 'Log in to FamilyCanvas to access your family tree. Continue building and sharing your family story.',
  },
  signup: {
    title: 'Sign Up Free',
    description: 'Create your free FamilyCanvas account and start building your family tree in minutes. No research required — just add your family.',
  },
  canvas: {
    title: 'My Family Tree',
    description: 'View and edit your family tree on FamilyCanvas.',
  },
  support: {
    title: 'Help & Support',
    description: 'Get help with FamilyCanvas. Find answers to common questions about building your family tree, managing relationships, and account settings.',
  },
  settings: {
    title: 'Account Settings',
    description: 'Manage your FamilyCanvas account settings and preferences.',
  },
  share: {
    title: 'Shared Family Tree',
    description: 'View a shared family tree on FamilyCanvas. Explore family connections across generations and countries.',
  },
  privacy: {
    title: 'Privacy Policy',
    description: 'FamilyCanvas privacy policy. Your family data stays yours — we never sell, share, or monetize your information.',
  },
  terms: {
    title: 'Terms of Service',
    description: 'FamilyCanvas terms of service. Read about your rights, data ownership, and how we operate.',
  },
};