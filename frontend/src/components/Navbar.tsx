import Link from 'next/link';

export function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold text-brand-700">
          🧳 Gruppen-Reiseplaner
        </Link>
        <Link href="/trips/create" className="btn-primary">
          Neuen Trip erstellen
        </Link>
      </div>
    </header>
  );
}
