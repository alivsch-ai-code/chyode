'use client';

import { useEffect, useState, type FormEvent } from 'react';
import useSWR from 'swr';
import type { AccommodationSuggestion, Trip, TripParticipant, TripStaySuggestion } from '@shared/types';
import { AccommodationCard } from '@/components/AccommodationCard';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Alert, Badge, EmptyState, Skeleton } from '@/components/ui/Feedback';
import {
  IconBed,
  IconCheck,
  IconExternal,
  IconEyeLock,
  IconFlower,
  IconHome,
  IconPlus,
  IconReceipt,
  IconRefresh,
  IconSnowflake,
  IconSparkles,
  IconTrash,
  IconUtensils,
  IconWave,
  type IconProps,
} from '@/components/ui/Icons';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import type { ComponentType } from 'react';

// Grobe Zuordnung häufiger Ausstattungs-Stichworte zu einem passenden Icon (Freitext bleibt möglich).
const AMENITY_ICONS: [RegExp, ComponentType<IconProps>][] = [
  [/sauna|spa|wellness/i, IconFlower],
  [/pool|schwimmbad|whirlpool/i, IconWave],
  [/fr[üu]hst[üu]ck|breakfast/i, IconUtensils],
  [/ski|piste/i, IconSnowflake],
  [/kamin|ofen/i, IconHome],
];

function amenityIcon(label: string): ComponentType<IconProps> {
  return AMENITY_ICONS.find(([re]) => re.test(label))?.[1] ?? IconCheck;
}

interface AccommodationResponse {
  topSuggestions: AccommodationSuggestion[];
  allSuggestions: AccommodationSuggestion[];
  cached?: boolean;
  searchedAt?: string;
  demo?: boolean;
}

export function StaysTab({
  tripId,
  isCreator,
  canSeeResults,
  trip,
  participants,
  myParticipantId,
  onTripChanged,
}: {
  tripId: string;
  isCreator: boolean;
  canSeeResults: boolean;
  trip: Trip;
  participants: TripParticipant[];
  myParticipantId: string;
  onTripChanged: () => void;
}) {
  const { toast } = useToast();
  const key = `/trips/${tripId}/accommodations`;
  const { data, error, isLoading, mutate } = useSWR<AccommodationResponse>(canSeeResults ? key : null);

  const [origin, setOrigin] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [searching, setSearching] = useState(false);
  const [showAll, setShowAll] = useState(false);

  async function search() {
    setSearching(true);
    try {
      const price = maxPrice.trim() ? Number(maxPrice.replace(',', '.')) : undefined;
      const result = await apiFetch<AccommodationResponse>(`${key}/search`, {
        method: 'POST',
        body: {
          origin: origin.trim() || undefined,
          maxPricePerNight: price && price > 0 ? price : undefined,
        },
      });
      await mutate({ ...result, cached: false, searchedAt: new Date().toISOString() }, { revalidate: false });
      toast('Suche abgeschlossen', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSearching(false);
    }
  }

  const top = data?.topSuggestions ?? [];
  const rest = (data?.allSuggestions ?? []).slice(top.length);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-title2">Unterkünfte</h2>
        <p className="mt-1 text-callout text-secondary">
          Die fest ausgewählte Unterkunft steht für alle sichtbar oben. Passende Vorschläge für das Favoriten-Wochenende
          folgen darunter, sobald der Ersteller die Auswertung freigibt.
        </p>
      </div>

      <AccommodationPick
        tripId={tripId}
        trip={trip}
        isCreator={isCreator}
        participants={participants}
        onChanged={onTripChanged}
      />

      <StaySuggestions
        tripId={tripId}
        isCreator={isCreator}
        myParticipantId={myParticipantId}
        onSelected={onTripChanged}
      />

      {!canSeeResults ? (
        <div className="card">
          <EmptyState icon={<IconEyeLock size={28} />} title="Unterkunftsvorschläge folgen">
            Die Vorschläge basieren auf dem Gruppenergebnis und erscheinen, sobald der Ersteller die Auswertung freigibt.
          </EmptyState>
        </div>
      ) : isLoading ? (
        <Skeleton className="h-56" />
      ) : error ? (
        <Alert tone="error">{errorMessage(error)}</Alert>
      ) : (
        <>

      {data?.demo && (
        <Alert tone="warning" title="Beispieldaten">
          Solange keine Anbindung an Buchungsportale konfiguriert ist, zeigt die Suche Beispielangebote. Preise und Links sind nicht
          verbindlich.
        </Alert>
      )}

      {isCreator ? (
        <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="search-heading">
          <h3 id="search-heading" className="text-headline">
            Suche starten
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Startort der Gruppe"
              optional
              placeholder="z. B. München"
              hint="Für die Entfernungsangabe."
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
            <Input
              label="Höchstpreis pro Nacht"
              optional
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="in Euro"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button loading={searching} onClick={search} icon={<IconRefresh size={18} />}>
              {top.length > 0 ? 'Suche aktualisieren' : 'Unterkünfte suchen'}
            </Button>
            {data?.searchedAt && (
              <p className="text-footnote text-secondary">Stand: {formatDateTime(data.searchedAt)}</p>
            )}
          </div>
        </section>
      ) : (
        top.length === 0 && <Alert tone="info">Der Ersteller der Reise startet die Unterkunftssuche.</Alert>
      )}

      {top.length === 0 ? (
        <div className="card">
          <EmptyState icon={<IconBed size={26} />} title="Noch keine Vorschläge">
            {isCreator
              ? 'Starte die Suche, sobald deine Gruppe abgestimmt hat.'
              : 'Sobald die Suche gestartet wurde, erscheinen die Vorschläge hier.'}
          </EmptyState>
        </div>
      ) : (
        <section aria-label="Top-Vorschläge" className="space-y-4">
          <h3 className="text-headline">Top 3 für deine Gruppe</h3>
          <div className="space-y-4">
            {top.map((suggestion, index) => (
              <AccommodationCard key={suggestion.id} suggestion={suggestion} rank={index + 1} hue={195 + index * 25} />
            ))}
          </div>

          {rest.length > 0 && (
            <div className="space-y-4 pt-2">
              <Button variant="plain" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                {showAll ? 'Weitere Vorschläge ausblenden' : `${rest.length} weitere Vorschläge anzeigen`}
              </Button>
              {showAll && (
                <div className="space-y-4">
                  {rest.map((suggestion, index) => (
                    <AccommodationCard key={suggestion.id} suggestion={suggestion} hue={210 + index * 20} />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
        </>
      )}
    </div>
  );
}

function AccommodationPick({
  tripId,
  trip,
  isCreator,
  participants,
  onChanged,
}: {
  tripId: string;
  trip: Trip;
  isCreator: boolean;
  participants: TripParticipant[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [url, setUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [note, setNote] = useState('');
  const [rating, setRating] = useState('');
  const [amenities, setAmenities] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const picked = Boolean(trip.accommodation_title);

  useEffect(() => {
    if (!open) return;
    setTitle(trip.accommodation_title ?? '');
    setAddress(trip.accommodation_address ?? '');
    setUrl(trip.accommodation_url ?? '');
    setImageUrl(trip.accommodation_image_url ?? '');
    setNote(trip.accommodation_note ?? '');
    setRating(trip.accommodation_rating ?? '');
    setAmenities((trip.accommodation_amenities ?? []).join(', '));
    setTotalPrice(trip.accommodation_total_price ?? '');
    setPaidBy(trip.accommodation_paid_by ?? participants[0]?.id ?? '');
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setFormError(null);
    setSaving(true);
    try {
      const ratingValue = rating.trim() ? Number(rating.replace(',', '.')) : undefined;
      const priceValue = totalPrice.trim() ? Number(totalPrice.replace(',', '.')) : undefined;
      await apiFetch(`/trips/${tripId}/accommodation`, {
        method: 'PUT',
        body: {
          title: title.trim(),
          address: address.trim() || undefined,
          url: url.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          note: note.trim() || undefined,
          rating: ratingValue !== undefined && ratingValue >= 0 ? ratingValue : undefined,
          amenities: amenities
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean),
          totalPrice: priceValue !== undefined && priceValue >= 0 ? priceValue : undefined,
          paidBy: priceValue ? paidBy || undefined : undefined,
        },
      });
      setOpen(false);
      onChanged();
      toast('Unterkunft gespeichert', 'success');
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setClearing(true);
    try {
      await apiFetch(`/trips/${tripId}/accommodation`, { method: 'DELETE' });
      onChanged();
      toast('Unterkunft entfernt', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setClearing(false);
    }
  }

  return (
    <>
      {picked ? (
        <section className="card overflow-hidden p-0" aria-label="Ausgewählte Unterkunft">
          {trip.accommodation_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={trip.accommodation_image_url} alt="" className="h-48 w-full object-cover" />
          )}
          <div className="space-y-3 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-footnote font-medium uppercase tracking-wide text-accent">Ausgewählte Unterkunft</p>
                <h3 className="text-headline">{trip.accommodation_title}</h3>
                {trip.accommodation_address && <p className="text-callout text-secondary">{trip.accommodation_address}</p>}
              </div>
              {trip.accommodation_rating && (
                <Badge tone="accent">
                  <IconSparkles size={13} /> {Number(trip.accommodation_rating).toFixed(1)}
                </Badge>
              )}
            </div>
            {trip.accommodation_note && <p className="whitespace-pre-line text-callout">{trip.accommodation_note}</p>}
            {trip.accommodation_amenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {trip.accommodation_amenities.map((a) => {
                  const Icon = amenityIcon(a);
                  return (
                    <Badge key={a} tone="neutral">
                      <Icon size={12} /> {a}
                    </Badge>
                  );
                })}
              </div>
            )}
            {trip.accommodation_total_price ? (
              <p className="text-callout text-secondary">
                Gesamtpreis <span className="font-semibold text-label">{formatMoney(Number(trip.accommodation_total_price))}</span>
                {' · bezahlt von '}
                {participants.find((p) => p.id === trip.accommodation_paid_by)?.name ?? '–'}
              </p>
            ) : (
              isCreator && (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="flex items-center gap-1.5 text-callout font-medium text-accent hover:underline"
                >
                  <IconReceipt size={15} /> Preis eintragen, damit er in die Kasse einfließt
                </button>
              )
            )}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              {trip.accommodation_url && (
                <a
                  href={trip.accommodation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-subhead font-medium text-accent hover:underline"
                >
                  Zum Angebot <IconExternal size={14} />
                </a>
              )}
              {isCreator && (
                <>
                  <Button variant="plain" size="sm" onClick={() => setOpen(true)}>
                    Bearbeiten
                  </Button>
                  <Button variant="danger" size="sm" loading={clearing} onClick={remove}>
                    Entfernen
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>
      ) : (
        isCreator && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="card flex w-full items-center gap-3 border-dashed p-5 text-left text-callout text-secondary transition hover:border-accent hover:text-accent"
          >
            <IconPlus size={20} /> Unterkunft eingetragen? Trag sie hier ein, damit alle sie sehen.
          </button>
        )
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Unterkunft eintragen">
        <form onSubmit={onSubmit} className="space-y-5 p-5 sm:p-6" noValidate>
          {formError && <Alert tone="error">{formError}</Alert>}
          <Input label="Name" placeholder="z. B. Exclusive Alpenlodge Galsterberg" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Adresse" optional placeholder="Straße, PLZ, Ort, Land" maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} />

          <div className="space-y-4 rounded-control bg-accent/10 p-4">
            <p className="flex items-center gap-1.5 text-subhead font-semibold text-accent">
              <IconReceipt size={16} /> Kosten (für die Kasse)
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Gesamtpreis"
                optional
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="in Euro"
                hint="Wird unter allen Mitgliedern aufgeteilt"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
              />
              <Select label="Bezahlt von" optional value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Link zur Buchung" optional placeholder="https://…" maxLength={500} value={url} onChange={(e) => setUrl(e.target.value)} />
            <Input label="Bild-URL" optional placeholder="https://…" maxLength={1000} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Bewertung"
              optional
              type="number"
              inputMode="decimal"
              min={0}
              max={5}
              step="0.1"
              placeholder="z. B. 4.8"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            />
            <Input
              label="Ausstattung"
              optional
              placeholder="Sauna, Kamin, Ski-in/Ski-out"
              hint="Mit Komma getrennt"
              maxLength={600}
              value={amenities}
              onChange={(e) => setAmenities(e.target.value)}
            />
          </div>
          <Textarea label="Notiz" optional rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="plain" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" loading={saving} disabled={!title.trim()}>
              Speichern
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

function StaySuggestions({
  tripId,
  isCreator,
  myParticipantId,
  onSelected,
}: {
  tripId: string;
  isCreator: boolean;
  myParticipantId: string;
  onSelected: () => void;
}) {
  const { toast } = useToast();
  const key = `/trips/${tripId}/stay-suggestions`;
  const { data, error, isLoading, mutate } = useSWR<{ suggestions: TripStaySuggestion[] }>(key);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [url, setUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setFormError(null);
    setSaving(true);
    try {
      const priceValue = price.trim() ? Number(price.replace(',', '.')) : undefined;
      await apiFetch(key, {
        method: 'POST',
        body: {
          title: title.trim(),
          address: address.trim() || undefined,
          url: url.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          note: note.trim() || undefined,
          price: priceValue !== undefined && priceValue >= 0 ? priceValue : undefined,
        },
      });
      setTitle('');
      setAddress('');
      setUrl('');
      setImageUrl('');
      setPrice('');
      setNote('');
      setOpen(false);
      await mutate();
      toast('Vorschlag hinzugefügt', 'success');
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`${key}/${id}`, { method: 'DELETE' });
      await mutate();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function select(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`${key}/${id}/select`, { method: 'POST' });
      onSelected();
      toast('Als ausgewählte Unterkunft übernommen', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  }

  const suggestions = data?.suggestions ?? [];

  return (
    <section className="space-y-4" aria-labelledby="suggestions-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="suggestions-heading" className="text-headline">
            Vorschläge aus der Gruppe
          </h3>
          <p className="mt-0.5 text-footnote text-secondary">
            Jede:r kann eine eigene Unterkunft eintragen – ganz ohne Booking.com oder Airbnb, z. B. einen Link oder
            Kontakt, den jemand selbst gefunden hat.
          </p>
        </div>
        <Button variant="tinted" size="sm" icon={<IconPlus size={16} />} onClick={() => setOpen(true)}>
          Vorschlagen
        </Button>
      </div>

      {isLoading && <Skeleton className="h-20" />}
      {error && <Alert tone="error">{errorMessage(error)}</Alert>}
      {data && suggestions.length === 0 && (
        <div className="card">
          <EmptyState icon={<IconHome size={24} />} title="Noch keine Vorschläge">
            Hat jemand schon eine passende Unterkunft gefunden? Hier eintragen.
          </EmptyState>
        </div>
      )}
      {suggestions.length > 0 && (
        <ul className="space-y-3">
          {suggestions.map((s) => (
            <li key={s.id} className="card space-y-2 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-callout font-semibold">{s.title}</p>
                  {s.address && <p className="text-footnote text-secondary">{s.address}</p>}
                </div>
                {s.price !== null && <Badge tone="neutral">{formatMoney(Number(s.price))}</Badge>}
              </div>
              {s.note && <p className="whitespace-pre-line text-callout text-secondary">{s.note}</p>}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
                <span className="text-footnote text-secondary">von {s.added_by_name}</span>
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-subhead font-medium text-accent hover:underline"
                  >
                    Ansehen <IconExternal size={13} />
                  </a>
                )}
                <div className="ml-auto flex items-center gap-2">
                  {isCreator && (
                    <Button variant="tinted" size="sm" loading={busyId === s.id} onClick={() => select(s.id)}>
                      Übernehmen
                    </Button>
                  )}
                  {(isCreator || s.trip_user_id === myParticipantId) && (
                    <button
                      type="button"
                      onClick={() => remove(s.id)}
                      disabled={busyId === s.id}
                      aria-label="Vorschlag löschen"
                      className="h-8 w-8 shrink-0 rounded-full text-secondary transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                    >
                      <IconTrash size={16} className="mx-auto" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Unterkunft vorschlagen">
        <form onSubmit={onSubmit} className="space-y-5 p-5 sm:p-6" noValidate>
          {formError && <Alert tone="error">{formError}</Alert>}
          <Input label="Name" placeholder="z. B. Ferienhaus am See" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Adresse" optional placeholder="Straße, PLZ, Ort, Land" maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Link" optional placeholder="https://…" maxLength={500} value={url} onChange={(e) => setUrl(e.target.value)} />
            <Input
              label="Preis"
              optional
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="in Euro, gesamt"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <Input label="Bild-URL" optional placeholder="https://…" maxLength={1000} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <Textarea label="Notiz" optional rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="plain" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" loading={saving} disabled={!title.trim()}>
              Vorschlagen
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
