import { LinkButton } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-narrow flex-col items-center pt-16 text-center">
      <p className="text-display text-tertiary">404</p>
      <h1 className="mt-4 text-title1">Seite nicht gefunden</h1>
      <p className="mt-2 text-callout text-secondary">Diese Seite gibt es nicht oder sie wurde verschoben.</p>
      <LinkButton href="/" size="lg" className="mt-8">
        Zur Startseite
      </LinkButton>
    </div>
  );
}
