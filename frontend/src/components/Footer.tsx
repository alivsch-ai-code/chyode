import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line/60">
      <div className="mx-auto flex max-w-content flex-col gap-3 px-4 py-8 text-footnote text-secondary sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} Reiseplaner · Reisen gemeinsam planen</p>
        <nav aria-label="Rechtliches" className="flex gap-5">
          <Link href="/impressum" className="transition hover:text-label">
            Impressum
          </Link>
          <Link href="/datenschutz" className="transition hover:text-label">
            Datenschutz
          </Link>
        </nav>
      </div>
    </footer>
  );
}
