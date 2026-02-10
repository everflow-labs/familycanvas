// app/manifest.ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FamilyCanvas — Family Tree Maker',
    short_name: 'FamilyCanvas',
    description:
      'Create a simple, visual family tree in minutes. Add people in seconds, track family across countries, and share with relatives.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f0faf4',
    theme_color: '#059669',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}