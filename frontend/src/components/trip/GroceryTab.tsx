'use client';

import { useMemo, useState, type FormEvent } from 'react';
import useSWR from 'swr';
import type { GrocerySummary, GroceryItem } from '@shared/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Alert, EmptyState, Skeleton } from '@/components/ui/Feedback';
import { IconCheck, IconTrash, IconUtensils } from '@/components/ui/Icons';
import { Segmented } from '@/components/ui/Segmented';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/format';

type SplitMode = 'even' | 'own';

export function GroceryTab({ tripId, myParticipantId }: { tripId: string; myParticipantId: string }) {
  const { toast } = useToast();
  const key = `/trips/${tripId}/groceries`;
  const { data, error, isLoading, mutate } = useSWR<{ items: GroceryItem[] }>(key);
  const { data: summary, mutate: mutateSummary } = useSWR<GrocerySummary>(`${key}/summary`);

  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState<SplitMode>('even');

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!item.trim()) return;
    setFormError(null);
    setSaving(true);
    try {
      const priceValue = price.trim() ? Number(price.replace(',', '.')) : undefined;
      await apiFetch(key, {
        method: 'POST',
        body: { item: item.trim(), quantity: quantity.trim() || undefined, price: priceValue && priceValue > 0 ? priceValue : undefined },
      });
      setItem('');
      setQuantity('');
      setPrice('');
      await Promise.all([mutate(), mutateSummary()]);
      toast('Zur Einkaufsliste hinzugefügt', 'success');
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(entry: GroceryItem) {
    setBusyId(entry.id);
    try {
      await mutate(
        async (current) => {
          const updated = await apiFetch<{ item: GroceryItem }>(`${key}/${entry.id}/toggle`, { method: 'PATCH' });
          return { items: (current?.items ?? []).map((i) => (i.id === entry.id ? updated.item : i)) };
        },
        { revalidate: false }
      );
      mutateSummary();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(entry: GroceryItem) {
    setBusyId(entry.id);
    try {
      await apiFetch(`${key}/${entry.id}`, { method: 'DELETE' });
      await Promise.all([mutate(), mutateSummary()]);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  }

  const items = data?.items ?? [];
  const open = items.filter((i) => !i.checked_at);
  const bought = items.filter((i) => i.checked_at);
  const hasPrices = items.some((i) => i.price !== null);

  const ownSpent = useMemo(
    () => summary?.byPerson.find((p) => p.tripUserId === myParticipantId)?.spent ?? 0,
    [summary, myParticipantId]
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-title2">Essen &amp; Einkaufsliste</h2>
        <p className="mt-1 text-callout text-secondary">
          Trag ein, was du zum Essen oder Trinken brauchst – daraus entsteht die gemeinsame Einkaufsliste. Mit Preis
          rechnet sich die Kostenaufteilung von selbst aus.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-5 p-5 sm:p-6" noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
          <Input
            label="Was brauchst du?"
            placeholder="z. B. Milch, Grillfleisch, Bier"
            maxLength={200}
            value={item}
            onChange={(e) => setItem(e.target.value)}
          />
          <Input
            label="Menge"
            optional
            placeholder="z. B. 2 Packungen"
            maxLength={60}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Input
            label="Preis"
            optional
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="in Euro"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <Button type="submit" loading={saving} disabled={!item.trim()}>
          Zur Liste hinzufügen
        </Button>
      </form>

      {hasPrices && summary && (
        <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="split-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="split-heading" className="text-headline">
              Kostenaufteilung
            </h3>
            <Segmented
              ariaLabel="Aufteilung wählen"
              value={splitMode}
              onChange={setSplitMode}
              options={[
                { value: 'even', label: 'Gleichmäßig' },
                { value: 'own', label: 'Nach eigenen Wünschen' },
              ]}
            />
          </div>
          <p className="text-callout text-secondary">
            Gesamtsumme: <span className="font-semibold text-label">{formatMoney(summary.total)}</span>
          </p>
          {splitMode === 'even' ? (
            <p className="text-callout">
              Jede Person zahlt <span className="font-semibold">{formatMoney(summary.perPersonEven)}</span> (
              {summary.participantCount} {summary.participantCount === 1 ? 'Teilnehmer' : 'Teilnehmer:innen'}).
            </p>
          ) : (
            <ul className="space-y-1.5">
              {summary.byPerson.map((p) => (
                <li key={p.tripUserId} className="flex items-center justify-between text-callout">
                  <span>{p.name}</span>
                  <span className={p.tripUserId === myParticipantId ? 'font-semibold text-accent' : ''}>
                    {formatMoney(p.spent)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {splitMode === 'own' && (
            <p className="text-footnote text-secondary">
              Du zahlst, was du selbst eingetragen hast: {formatMoney(ownSpent)}.
            </p>
          )}
        </section>
      )}

      <section aria-label="Einkaufsliste" className="space-y-5">
        {isLoading && <Skeleton className="h-24" />}
        {error && <Alert tone="error">{errorMessage(error)}</Alert>}
        {data && items.length === 0 && (
          <div className="card">
            <EmptyState icon={<IconUtensils size={26} />} title="Noch nichts eingetragen">
              Sei die erste Person, die einen Essenswunsch hinterlässt.
            </EmptyState>
          </div>
        )}
        {open.length > 0 && (
          <ul className="space-y-2.5">
            {open.map((entry) => (
              <GroceryRow
                key={entry.id}
                entry={entry}
                mine={entry.trip_user_id === myParticipantId}
                busy={busyId === entry.id}
                onToggle={() => toggle(entry)}
                onDelete={() => remove(entry)}
              />
            ))}
          </ul>
        )}
        {bought.length > 0 && (
          <div className="space-y-2.5">
            <h3 className="text-footnote font-medium uppercase tracking-wide text-tertiary">Schon besorgt</h3>
            <ul className="space-y-2.5">
              {bought.map((entry) => (
                <GroceryRow
                  key={entry.id}
                  entry={entry}
                  mine={entry.trip_user_id === myParticipantId}
                  busy={busyId === entry.id}
                  onToggle={() => toggle(entry)}
                  onDelete={() => remove(entry)}
                />
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function GroceryRow({
  entry,
  mine,
  busy,
  onToggle,
  onDelete,
}: {
  entry: GroceryItem;
  mine: boolean;
  busy: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const checked = Boolean(entry.checked_at);
  return (
    <li className={`card flex items-center gap-3.5 p-4 ${checked ? 'opacity-60' : ''}`}>
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        aria-pressed={checked}
        aria-label={checked ? `${entry.item} wieder als offen markieren` : `${entry.item} als gekauft abhaken`}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition disabled:opacity-40 ${
          checked ? 'border-accent bg-accent text-white' : 'border-line hover:border-accent'
        }`}
      >
        {checked && <IconCheck size={15} strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-callout font-medium ${checked ? 'line-through' : ''}`}>
          {entry.item}
          {entry.quantity && <span className="font-normal text-secondary"> · {entry.quantity}</span>}
        </p>
        <p className="mt-0.5 text-footnote text-secondary">
          von {entry.added_by_name}
          {entry.price !== null && <span> · {formatMoney(Number(entry.price))}</span>}
          {checked && entry.checked_by_name && <span> · besorgt von {entry.checked_by_name}</span>}
        </p>
      </div>
      {mine && (
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label="Eintrag löschen"
          className="h-9 w-9 shrink-0 rounded-full text-secondary transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
        >
          <IconTrash size={18} className="mx-auto" />
        </button>
      )}
    </li>
  );
}
