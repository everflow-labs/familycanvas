// components/seo/JsonLd.tsx

type JsonLdProps = {
  type: 'website' | 'webapp' | 'faq';
};

export function WebsiteJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'FamilyCanvas',
    url: 'https://www.familycanvas.app',
    description:
      'Create a simple, visual family tree in minutes. Add people in seconds, track family across countries and generations, and share with relatives.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://www.familycanvas.app/signup',
      'query-input': 'required',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function WebAppJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'FamilyCanvas',
    url: 'https://www.familycanvas.app',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free to start with optional paid upgrades',
    },
    description:
      'A simple, visual family tree maker for modern families. Add people in seconds, track family across countries, share with relatives, and export as PDF.',
    featureList: [
      'Visual family tree canvas',
      'Add people in 30 seconds',
      'Track family across countries',
      'Support for all family structures',
      'Export as PDF',
      'Share with family via link',
      'Native script names',
      'Mobile-friendly',
    ],
    screenshot: 'https://www.familycanvas.app/og-image.png',
    aggregateRating: undefined, // Add later when you have reviews
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function FAQJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is FamilyCanvas free?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! FamilyCanvas is free to start. You get 2 family canvases and up to 100 people per canvas. Optional one-time purchases let you expand with more canvases and leaves.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I create a family tree?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sign up for free, then start adding family members by clicking the + button. Add a partner, child, parent, or sibling — each person takes about 30 seconds. The visual canvas updates automatically as you build.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I share my family tree with relatives?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Generate a shareable link and send it to anyone. They can view your family tree in read-only mode without needing an account. You can also export your tree as a PDF.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does FamilyCanvas support all family structures?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. FamilyCanvas is built to be fully inclusive. Same-sex couples, blended families, adoptive parents, non-binary family members — everyone belongs. The tool makes no assumptions about family structure.',
        },
      },
      {
        '@type': 'Question',
        name: 'Will my family data be sold or shared?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. Your family data is never sold, shared, licensed, or provided to any third party. All trees are private by default. You own your data and can delete it at any time.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I track family across multiple countries?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Each person can have a current location/country, native script name, and notes. FamilyCanvas is designed for families spread across the globe — no matter how many countries your family spans.',
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
