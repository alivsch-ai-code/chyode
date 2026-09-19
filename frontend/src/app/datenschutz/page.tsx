import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Datenschutz' };

export default function DatenschutzPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-title1 sm:text-[2.25rem]">Datenschutz</h1>
      </header>

      <div className="rounded-control bg-warning/10 px-4 py-3 text-subhead" role="note">
        <strong className="font-semibold">Vorlage:</strong> Bitte Angaben in eckigen Klammern ergänzen und den Text vor dem
        Livegang prüfen lassen. Dies ist keine Rechtsberatung.
      </div>

      <Section title="Verantwortlicher">
        [Name und Anschrift des Betreibers] · E-Mail: info@azamatsysteme.fun
      </Section>

      <Section title="Welche Daten wir verarbeiten">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="font-semibold text-label">Konto:</strong> Name, E-Mail-Adresse und ein verschlüsselter
            Passwort-Hash (das Passwort selbst wird nicht gespeichert).
          </li>
          <li>
            <strong className="font-semibold text-label">Registrierung:</strong> Bis zur Bestätigung der E-Mail-Adresse wird
            die Anfrage (Name, E-Mail-Adresse, Passwort-Hash) gespeichert; unbestätigte Anfragen verfallen nach 24 Stunden und
            werden später gelöscht.
          </li>
          <li>
            <strong className="font-semibold text-label">Reisedaten:</strong> Reisen, Terminvorschläge, Abstimmungen,
            Notizen und Teilnahmen, die du selbst eingibst.
          </li>
          <li>
            <strong className="font-semibold text-label">Technische Daten:</strong> IP-Adresse und Zeitpunkt der Zugriffe in
            Server-Protokollen (zur Sicherheit und Fehleranalyse).
          </li>
        </ul>
      </Section>

      <Section title="Zwecke und Rechtsgrundlagen">
        Die Verarbeitung erfolgt zur Bereitstellung der Anwendung und zur Durchführung der Gruppenplanung (Art. 6 Abs. 1 lit. b
        DSGVO) sowie zur Sicherheit des Angebots (Art. 6 Abs. 1 lit. f DSGVO).
      </Section>

      <Section title="Cookies">
        Wir setzen ausschließlich einen technisch notwendigen Sitzungs-Cookie (<code className="text-label">tp_session</code>),
        der dich angemeldet hält. Es gibt kein Tracking und keine Werbe- oder Analyse-Cookies.
      </Section>

      <Section title="E-Mail-Versand">
        Einladungen und Passwort-Zurücksetzen werden über ein E-Mail-Postfach bei IONOS SE versendet. Dabei werden E-Mail-Adresse
        und Nachrichteninhalt verarbeitet.
      </Section>

      <Section title="Hosting">
        Die Anwendung wird auf einem Server der IONOS SE betrieben. [Auftragsverarbeitungsvertrag mit dem Hoster prüfen.]
      </Section>

      <Section title="Externe Links">
        Die Ideen- und Unterkunftsvorschläge enthalten Links zu Google Maps und Buchungsportalen. Erst wenn du einen Link anklickst,
        werden Daten an den jeweiligen Anbieter übertragen.
      </Section>

      <Section title="Speicherdauer">
        Kontodaten werden bis zur Löschung des Kontos gespeichert. Server-Protokolle werden nach [Zeitraum] gelöscht.
      </Section>

      <Section title="Deine Rechte">
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und
        Widerspruch sowie auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde. Wende dich dazu an die oben genannte Adresse.
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-title3">{title}</h2>
      <div className="text-callout text-secondary">{children}</div>
    </section>
  );
}
