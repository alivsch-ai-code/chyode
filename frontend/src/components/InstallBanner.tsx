'use client';

import { useEffect, useState } from 'react';
import { COOKIE_NOTICE_KEY } from '@/components/CookieNotice';
import { Button } from '@/components/ui/Button';
import { IconDownload, IconShare, IconX } from '@/components/ui/Icons';

const DISMISS_KEY = 'tp_install_banner_dismissed_v1';

/** Chrome liefert dieses Event nur auf Android/Desktop-Chrome, nie auf iOS/Safari. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
}

function cookieNoticeAccepted(): boolean {
  try {
    return Boolean(localStorage.getItem(COOKIE_NOTICE_KEY));
  } catch {
    return true; // kein Speicher verfügbar: nicht zusätzlich blockieren
  }
}

/**
 * Install-Hinweis für die PWA: auf Android/Chrome der native Install-Button (beforeinstallprompt),
 * auf iPhone/iPad eine Anleitung zum manuellen Hinzufügen (iOS unterstützt keinen Install-Prompt).
 * Erscheint erst, nachdem der Cookie-Hinweis akzeptiert wurde, damit nie zwei Banner übereinander stehen.
 */
export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [ready, setReady] = useState(false);
  const [installing, setInstalling] = useState(false);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    } catch {
      /* Speicher nicht verfügbar: Hinweis kann beim nächsten Besuch erneut erscheinen */
    }
    setDeferredPrompt(null);
    setShowIOS(false);
  }

  useEffect(() => {
    let dismissed: string | null = null;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY);
    } catch {
      /* Speicher nicht verfügbar: Hinweis einfach anzeigen */
    }
    if (dismissed || isStandalone()) return;

    const check = () => setReady(cookieNoticeAccepted());
    check();
    window.addEventListener('tp:cookie-accepted', check);

    if (isIOS()) setShowIOS(true);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', dismiss);

    return () => {
      window.removeEventListener('tp:cookie-accepted', check);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', dismiss);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function installAndroid() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setInstalling(false);
      dismiss();
    }
  }

  if (!ready || (!deferredPrompt && !showIOS)) return null;

  return (
    <section
      aria-label="App installieren"
      className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-2xl animate-fade-up rounded-card bg-elevated p-5 shadow-sheet ring-1 ring-line/60 sm:bottom-5 sm:p-6"
    >
      <div className="flex gap-4">
        <span className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent sm:flex">
          <IconDownload size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-headline">Reiseplaner installieren</h2>
          {deferredPrompt ? (
            <>
              <p className="mt-1 text-subhead text-secondary">
                Als App auf deinem Startbildschirm hinzufügen – schneller Zugriff, kein App Store nötig.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={installAndroid} loading={installing} icon={<IconDownload size={16} />}>
                  App installieren
                </Button>
                <Button variant="plain" onClick={dismiss}>
                  Nicht jetzt
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-subhead text-secondary">
                Zum Home-Bildschirm hinzufügen: Tippe unten auf{' '}
                <IconShare size={15} className="mb-0.5 inline-block text-label" aria-label="Teilen-Symbol" /> und dann auf
                „Zum Home-Bildschirm“.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="plain" onClick={dismiss}>
                  Verstanden
                </Button>
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Hinweis schließen"
          className="h-8 w-8 shrink-0 rounded-full text-secondary transition hover:bg-fill/15 hover:text-label"
        >
          <IconX size={16} className="mx-auto" />
        </button>
      </div>
    </section>
  );
}
