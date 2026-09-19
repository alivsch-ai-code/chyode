import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { RetentionSummary } from '@/components/RetentionSummary';

export const metadata: Metadata = { title: 'Datenschutz & Sicherheit' };

export default function DatenschutzPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-9">
      <header className="space-y-2">
        <h1 className="text-title1 sm:text-[2.25rem]">Datenschutz &amp; Sicherheit</h1>
        <p className="text-callout text-secondary">Stand: September 2026</p>
      </header>

      <div className="rounded-control bg-accent/10 px-5 py-4 text-callout" role="note">
        <p className="font-semibold">Das Wichtigste in Kürze</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-secondary">
          <li>Wir verarbeiten nur, was für die Nutzung nötig ist: Name, E-Mail-Adresse und deine Angaben zur Reise.</li>
          <li>Kein Tracking, keine Werbung, keine Analyse-Tools, keine Drittanbieter-Einbindungen.</li>
          <li>Reisedaten werden nach der Abstimmung automatisch gelöscht. Du kannst Reise und Konto jederzeit selbst löschen.</li>
          <li>Andere sehen nie deine einzelnen Angaben, sondern nur die Gruppenauswertung – und erst nach Freigabe.</li>
        </ul>
      </div>

      <Section title="1. Verantwortlicher">
        [Name und Anschrift des Betreibers] · E-Mail:{' '}
        <a className="text-accent hover:underline" href="mailto:info@azamatsysteme.fun">
          info@azamatsysteme.fun
        </a>
        <p className="mt-2 text-footnote">Die Angaben in eckigen Klammern muss der Betreiber vor dem Livegang ergänzen.</p>
      </Section>

      <Section title="2. Welche Daten wir verarbeiten und wofür">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="font-semibold text-label">Konto:</strong> Name, E-Mail-Adresse und ein verschlüsselter
            Passwort-Hash (das Passwort selbst wird nie gespeichert). Zweck: Anmeldung und Zuordnung deiner Reisen.
          </li>
          <li>
            <strong className="font-semibold text-label">Registrierung:</strong> Bis zur Bestätigung deiner E-Mail-Adresse
            wird die Anfrage (Name, E-Mail-Adresse, Passwort-Hash) gespeichert. Unbestätigte Anfragen verfallen nach 24 Stunden
            und werden gelöscht.
          </li>
          <li>
            <strong className="font-semibold text-label">Reisedaten:</strong> Titel, Ort, Termine, deine Zu- und Absagen,
            Notizen sowie deine Präferenzen (Höchstbudget für Übernachtung und Aktivitäten, gewünschte Erlebnisse und
            Unterkunftsarten). Zweck: gemeinsame Planung mit deiner Gruppe.
          </li>
          <li>
            <strong className="font-semibold text-label">E-Mails:</strong> Wir verschicken Einladungen, Bestätigungs- und
            Reset-Links sowie eine Nachricht, wenn das Ergebnis einer Reise feststeht. Werbe- oder Newsletter-Mails gibt es
            nicht.
          </li>
        </ul>
        <p className="mt-3">
          <strong className="font-semibold text-label">Nicht erfasst werden:</strong> Standortdaten, Geräte-Kennungen,
          Nutzungsprofile, Zugriffsprotokolle mit IP-Adressen. Das Zugriffsprotokoll des Webservers ist abgeschaltet; die
          Anwendungsprotokolle enthalten weder IP-Adressen noch Browserkennungen, und Links mit Zugangs-Token werden
          unkenntlich gemacht. Technisch bedingt verarbeitet der Server deine IP-Adresse kurzzeitig im Arbeitsspeicher, um die
          Verbindung herzustellen und Missbrauch (z. B. massenhafte Anmeldeversuche) zu begrenzen.
        </p>
      </Section>

      <Section title="3. Rechtsgrundlagen">
        Die Verarbeitung erfolgt zur Bereitstellung der Anwendung und zur Durchführung der Gruppenplanung (Art. 6 Abs. 1 lit. b
        DSGVO) sowie zur Sicherheit des Angebots (Art. 6 Abs. 1 lit. f DSGVO). Dein berechtigtes Interesse liegt darin, dass
        die Anwendung zuverlässig und geschützt vor Missbrauch läuft.
      </Section>

      <Section title="4. Speicherdauer und automatische Löschung">
        <RetentionSummary />
      </Section>

      <Section title="5. Cookies und lokaler Speicher">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <code className="text-label">tp_session</code> – Sitzungs-Cookie, hält dich angemeldet (bis zu 7 Tage, HttpOnly,
            Secure, SameSite=Lax). Technisch notwendig.
          </li>
          <li>
            <code className="text-label">tp_cookie_notice_v1</code> – merkt sich lokal in deinem Browser, dass du diesen
            Hinweis gesehen hast. Technisch notwendig, wird nicht an den Server übertragen.
          </li>
        </ul>
        <p className="mt-3">
          Es werden keine Tracking-, Werbe- oder Analyse-Cookies gesetzt. Für technisch unbedingt erforderliche Cookies ist nach
          § 25 Abs. 2 Nr. 2 TDDDG keine Einwilligung nötig; der Hinweis beim ersten Besuch dient der Transparenz.
        </p>
      </Section>

      <Section title="6. Empfänger und Auftragsverarbeiter">
        Die Anwendung wird auf einem Server der IONOS SE betrieben; der E-Mail-Versand erfolgt über ein IONOS-Postfach.
        Dabei werden deine E-Mail-Adresse und der Nachrichteninhalt verarbeitet. [Standort des Rechenzentrums und
        Auftragsverarbeitungsvertrag mit IONOS bestätigen.] Eine Weitergabe an weitere Dritte oder eine Übermittlung in
        Drittländer findet nicht statt.
      </Section>

      <Section title="7. Externe Links">
        Die Ideen- und Unterkunftsvorschläge enthalten Links zu Google Maps und Buchungsportalen. Erst wenn du einen Link
        anklickst, werden Daten an den jeweiligen Anbieter übertragen; auf der Seite selbst werden keine externen Inhalte
        nachgeladen.
      </Section>

      <Section title="8. Technische und organisatorische Maßnahmen (Sicherheit)">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Verschlüsselte Übertragung über HTTPS (TLS) inklusive HSTS.</li>
          <li>Passwörter nur als bcrypt-Hash mit hohem Kostenfaktor; Mindestlänge 10 Zeichen.</li>
          <li>Sitzungs-Cookie mit HttpOnly, Secure und SameSite; Abmeldung beendet die Sitzung, Passwortänderungen beenden alle anderen.</li>
          <li>Einladungs-, Bestätigungs- und Reset-Links werden nur als Hash gespeichert, sind zeitlich begrenzt und einmalig nutzbar.</li>
          <li>Schutz vor Missbrauch: Kontosperre nach mehreren Fehlversuchen, Begrenzung der Anfragen, neutrale Antworten (keine Rückschlüsse, welche E-Mail-Adressen registriert sind).</li>
          <li>Rechte und Rollen: Nur Mitglieder einer Reise sehen deren Inhalte; die Auswertung sieht der Ersteller, alle anderen erst nach seiner Freigabe. Einzelne Präferenzen sind nie einsehbar.</li>
          <li>Server: Firewall (nur Web und Administrationszugang offen), Datenbank nicht aus dem Internet erreichbar, Schutz vor Brute-Force-Angriffen, automatische Sicherheitsupdates, tägliche Datensicherung mit kurzer Aufbewahrung (7 Tage).</li>
          <li>Datensparsamkeit durch Voreinstellung: automatische Löschung, keine unnötigen Protokolle.</li>
        </ul>
        <p className="mt-3">
          Sicherheitslücken meldest du bitte an{' '}
          <a className="text-accent hover:underline" href="mailto:info@azamatsysteme.fun">
            info@azamatsysteme.fun
          </a>{' '}
          (siehe auch <a className="text-accent hover:underline" href="/.well-known/security.txt">security.txt</a>).
        </p>
      </Section>

      <Section title="9. Deine Rechte">
        Du hast das Recht auf <strong className="font-semibold text-label">Auskunft</strong>,{' '}
        <strong className="font-semibold text-label">Berichtigung</strong> (Namen änderst du unter „Konto“),{' '}
        <strong className="font-semibold text-label">Löschung</strong> (Konto und Reisen löschst du selbst in der Anwendung),
        Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Du kannst dich außerdem bei einer
        Datenschutz-Aufsichtsbehörde beschweren [zuständige Behörde ergänzen]. Wende dich für Auskünfte an die oben genannte
        Adresse.
      </Section>

      <Section title="10. Automatisierte Entscheidungen">
        Es findet keine automatisierte Entscheidungsfindung oder Profilbildung statt. Die Auswertung (z. B. Median des
        Budgets, häufigste Wahl) dient nur der Anzeige für die Gruppe.
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-title3">{title}</h2>
      <div className="text-callout text-secondary">{children}</div>
    </section>
  );
}
