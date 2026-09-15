import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="card text-center">
        <h1 className="text-3xl font-bold text-slate-900">Plant eure nächste Gruppenreise gemeinsam</h1>
        <p className="mt-3 text-slate-600">
          Erstelle einen Trip, teile den Einladungslink mit deinen Freund:innen und lasst die App
          automatisch passende Unterkünfte vorschlagen – basierend auf Termin-Voting, Wünschen und Budget.
        </p>
        <Link href="/trips/create" className="btn-primary mt-6">
          Jetzt Trip erstellen
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <h2 className="font-semibold">1. Trip erstellen</h2>
          <p className="mt-2 text-sm text-slate-600">
            Titel, Ort, Reiseart und Terminoptionen festlegen – dann den Einladungslink teilen.
          </p>
        </div>
        <div className="card">
          <h2 className="font-semibold">2. Voten & Wünsche äußern</h2>
          <p className="mt-2 text-sm text-slate-600">
            Freunde wählen ihren Wunschtermin, geben die Personenanzahl an und hinterlassen Notizen.
          </p>
        </div>
        <div className="card">
          <h2 className="font-semibold">3. Unterkünfte entdecken</h2>
          <p className="mt-2 text-sm text-slate-600">
            Die App durchsucht automatisch Booking.com &amp; Airbnb und schlägt die Top-3-Optionen vor.
          </p>
        </div>
      </section>
    </div>
  );
}
