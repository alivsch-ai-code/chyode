'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { IconShield } from '@/components/ui/Icons';

const STORAGE_KEY = 'tp_cookie_notice_v1';

/**
 * Cookie-Hinweis beim ersten Besuch. Die App setzt ausschließlich den technisch notwendigen
 * Sitzungs-Cookie (Login); es gibt kein Tracking. Die Bestätigung wird lokal im Browser gemerkt.
 */
export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* Speicher nicht verfügbar: Hinweis erscheint beim nächsten Besuch erneut */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <section
      aria-label="Hinweis zu Cookies"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-2xl animate-fade-up rounded-card bg-elevated p-5 shadow-sheet ring-1 ring-line/60 sm:bottom-5 sm:p-6"
    >
      <div className="flex gap-4">
        <span className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent sm:flex">
          <IconShield size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-headline">Cookies</h2>
          <p className="mt-1 text-subhead text-secondary">
            Wir setzen nur einen technisch notwendigen Cookie, der dich angemeldet hält. Kein Tracking, keine Werbung, keine
            Analyse. Mehr dazu in der{' '}
            <Link href="/datenschutz" className="text-accent hover:underline">
              Datenschutzerklärung
            </Link>
            .
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={accept}>Akzeptieren</Button>
            <Link
              href="/datenschutz"
              className="inline-flex h-11 items-center rounded-full px-4 text-callout font-medium text-accent hover:underline"
            >
              Mehr erfahren
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
