import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Impressum' };

export default function ImpressumPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-title1 sm:text-[2.25rem]">Impressum</h1>
      </header>

      <div className="rounded-control bg-warning/10 px-4 py-3 text-subhead" role="note">
        <strong className="font-semibold">Vorlage:</strong> Die Angaben in eckigen Klammern sind Platzhalter und müssen vom
        Betreiber ausgefüllt werden. Dies ist keine Rechtsberatung.
      </div>

      <section className="space-y-2">
        <h2 className="text-title3">Angaben gemäß § 5 DDG</h2>
        <p className="text-callout text-secondary">
          [Vor- und Nachname bzw. Firma]
          <br />
          [Straße und Hausnummer]
          <br />
          [PLZ und Ort]
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-title3">Kontakt</h2>
        <p className="text-callout text-secondary">
          E-Mail: info@azamatsysteme.fun
          <br />
          [Telefon, falls gewünscht]
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-title3">Verantwortlich für den Inhalt</h2>
        <p className="text-callout text-secondary">[Name und Anschrift der verantwortlichen Person]</p>
      </section>
    </article>
  );
}
