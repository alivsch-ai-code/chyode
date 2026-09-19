import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CookieNotice } from '@/components/CookieNotice';

export const metadata: Metadata = {
  title: { default: 'Reiseplaner', template: '%s · Reiseplaner' },
  description: 'Reisen gemeinsam planen: Wochenenden abstimmen, Wünsche sammeln und passende Unterkünfte finden.',
  applicationName: 'Reiseplaner',
  // geschlossene Nutzergruppe: nicht in Suchmaschinen aufnehmen
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <Navbar />
          <main id="main" className="mx-auto w-full max-w-content flex-1 px-4 py-8 sm:px-6 sm:py-12">
            {children}
          </main>
          <Footer />
          <CookieNotice />
        </Providers>
      </body>
    </html>
  );
}
