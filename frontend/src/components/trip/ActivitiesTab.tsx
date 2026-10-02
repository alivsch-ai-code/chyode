'use client';

import { useState, type FormEvent } from 'react';
import useSWR from 'swr';
import type { ActivityCategory, TripActivity } from '@shared/types';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Alert, Badge, EmptyState, Skeleton } from '@/components/ui/Feedback';
import { IconCompass, IconExternal, IconPlus, IconTrash } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, errorMessage } from '@/lib/api';
import { ACTIVITY_CATEGORIES, ACTIVITY_CATEGORY_LABELS } from '@/lib/catalog';
import { formatMoney } from '@/lib/format';

const CATEGORY_TONES: Record<ActivityCategory, 'accent' | 'success' | 'warning' | 'neutral'> = {
  wellness: 'accent',
  nature: 'success',
  sport: 'warning',
  food: 'neutral',
};

function formatDuration(min: number): string {
  if (min < 60) return `${min} Min.`;
  const hours = Math.floor(min / 60);
  const rest = min % 60;
  return rest === 0 ? `ca. ${hours} Std.` : `ca. ${hours}:${String(rest).padStart(2, '0')} Std.`;
}

export function ActivitiesTab({ tripId, myParticipantId }: { tripId: string; myParticipantId: string }) {
  const { toast } = useToast();
  const key = `/trips/${tripId}/activities`;
  const { data, error, isLoading, mutate } = useSWR<{ activities: TripActivity[] }>(key);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ActivityCategory | ''>('');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityCategory | 'all'>('all');
  const [open, setOpen] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setFormError(null);
    setSaving(true);
    try {
      const distanceValue = distance.trim() ? Number(distance.replace(',', '.')) : undefined;
      const durationValue = duration.trim() ? Math.round(Number(duration.replace(',', '.'))) : undefined;
      const priceValue = price.trim() ? Number(price.replace(',', '.')) : undefined;
      await apiFetch(key, {
        method: 'POST',
        body: {
          title: title.trim(),
          category: category || undefined,
          distanceKm: distanceValue !== undefined && distanceValue >= 0 ? distanceValue : undefined,
          durationMin: durationValue !== undefined && durationValue >= 0 ? durationValue : undefined,
          price: priceValue !== undefined && priceValue >= 0 ? priceValue : undefined,
          description: description.trim() || undefined,
          link: link.trim() || undefined,
        },
      });
      setTitle('');
      setCategory('');
      setDistance('');
      setDuration('');
      setPrice('');
      setDescription('');
      setLink('');
      setOpen(false);
      await mutate();
      toast('Aktivität hinzugefügt', 'success');
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(activity: TripActivity) {
    setDeletingId(activity.id);
    try {
      await apiFetch(`${key}/${activity.id}`, { method: 'DELETE' });
      await mutate();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setDeletingId(null);
    }
  }

  const activities = data?.activities ?? [];
  const filtered = filter === 'all' ? activities : activities.filter((a) => a.category === filter);
  const countByCategory = (cat: ActivityCategory) => activities.filter((a) => a.category === cat).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-title2">Aktivitäten in der Nähe</h2>
          <p className="mt-1 text-callout text-secondary">
            Sammelt gemeinsam Ideen, was ihr vor Ort unternehmen wollt – von der Wanderroute bis zum Saunagang.
          </p>
        </div>
        <Button icon={<IconPlus size={18} />} onClick={() => setOpen(true)}>
          Hinzufügen
        </Button>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="Aktivität hinzufügen">
        <form onSubmit={onSubmit} className="space-y-5 p-5 sm:p-6" noValidate>
          {formError && <Alert tone="error">{formError}</Alert>}
          <Input label="Titel" placeholder="z. B. Schneeschuhwanderung zur Galsterberghütte" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Kategorie" optional value={category} onChange={(e) => setCategory(e.target.value as ActivityCategory | '')}>
              <option value="">Keine Angabe</option>
              {ACTIVITY_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Input
              label="Preis pro Person"
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Entfernung"
              optional
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              placeholder="in km"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
            <Input
              label="Dauer"
              optional
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="in Minuten"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          <Textarea
            label="Beschreibung"
            optional
            rows={2}
            maxLength={500}
            placeholder="z. B. Dauer, Schwierigkeit, Treffpunkt"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            label="Link"
            optional
            placeholder="z. B. Google-Maps-Route oder Veranstalter-Website"
            maxLength={500}
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="plain" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" loading={saving} disabled={!title.trim()}>
              Aktivität hinzufügen
            </Button>
          </div>
        </form>
      </Dialog>

      {activities.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Nach Kategorie filtern">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            Alle · {activities.length}
          </FilterChip>
          {ACTIVITY_CATEGORIES.map((c) => {
            const count = countByCategory(c.key);
            if (count === 0) return null;
            return (
              <FilterChip key={c.key} active={filter === c.key} onClick={() => setFilter(c.key)}>
                {c.label} · {count}
              </FilterChip>
            );
          })}
        </div>
      )}

      <section aria-label="Gesammelte Aktivitäten" className="space-y-3">
        {isLoading && <Skeleton className="h-24" />}
        {error && <Alert tone="error">{errorMessage(error)}</Alert>}
        {data && activities.length === 0 && (
          <div className="card">
            <EmptyState icon={<IconCompass size={26} />} title="Noch keine Aktivitäten">
              Trag die erste Idee ein – Wanderung, Sauna, Skifahren oder Einkehr.
            </EmptyState>
          </div>
        )}
        {activities.length > 0 && filtered.length === 0 && (
          <Alert tone="info">Keine Aktivitäten in dieser Kategorie.</Alert>
        )}
        {filtered.length > 0 && (
          <ul className="space-y-3">
            {filtered.map((activity) => (
              <li key={activity.id} className="card space-y-2 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-callout font-semibold">{activity.title}</p>
                    {activity.category && (
                      <Badge tone={CATEGORY_TONES[activity.category]}>{ACTIVITY_CATEGORY_LABELS[activity.category]}</Badge>
                    )}
                  </div>
                  {activity.trip_user_id === myParticipantId && (
                    <button
                      type="button"
                      onClick={() => remove(activity)}
                      disabled={deletingId === activity.id}
                      aria-label="Aktivität löschen"
                      className="h-9 w-9 shrink-0 rounded-full text-secondary transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                    >
                      <IconTrash size={18} className="mx-auto" />
                    </button>
                  )}
                </div>
                {activity.description && <p className="whitespace-pre-line text-callout text-secondary">{activity.description}</p>}
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-footnote text-secondary">
                  {activity.distance_km !== null && <span>{Number(activity.distance_km)} km entfernt</span>}
                  {activity.duration_min !== null && <span>{formatDuration(activity.duration_min)}</span>}
                  {activity.price !== null && <span>{Number(activity.price) === 0 ? 'Kostenlos' : formatMoney(Number(activity.price))}</span>}
                  <span>von {activity.added_by_name}</span>
                </p>
                {activity.link && (
                  <a
                    href={activity.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-subhead font-medium text-accent hover:underline"
                  >
                    Mehr erfahren <IconExternal size={14} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3.5 py-1.5 text-footnote font-medium transition ${
        active ? 'bg-accent text-white dark:text-black' : 'bg-fill/12 text-label hover:bg-fill/20'
      }`}
    >
      {children}
    </button>
  );
}
