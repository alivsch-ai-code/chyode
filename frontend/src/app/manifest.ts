import type { MetadataRoute } from 'next';

// Next.js liefert das unter /manifest.webmanifest aus und verlinkt es automatisch im <head>.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Reiseplaner',
    short_name: 'Reiseplaner',
    description: 'Reisen gemeinsam planen: Wochenenden abstimmen, Wünsche sammeln und passende Unterkünfte finden.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f5f7',
    theme_color: '#0071e3',
    lang: 'de',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
