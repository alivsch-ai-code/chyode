'use client';

import { useEffect } from 'react';
import { Button, LinkButton } from '@/components/ui/Button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-narrow flex-col items-center pt-16 text-center">
      <h1 className="text-title1">Etwas ist schiefgelaufen</h1>
      <p className="mt-2 text-callout text-secondary">
        Die Seite konnte nicht angezeigt werden. Versuche es noch einmal – wenn das Problem bleibt, melde dich beim Administrator.
      </p>
      <div className="mt-8 flex gap-3">
        <Button size="lg" onClick={reset}>
          Erneut versuchen
        </Button>
        <LinkButton href="/" variant="plain" size="lg">
          Zur Startseite
        </LinkButton>
      </div>
    </div>
  );
}
