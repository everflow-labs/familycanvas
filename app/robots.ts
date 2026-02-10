// app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/canvas',
          '/settings',
          '/purchase',
          '/api/',
          '/auth/',
        ],
      },
    ],
    sitemap: 'https://www.familycanvas.app/sitemap.xml',
  };
}