'use client';

import { useState, type FormEvent } from 'react';
import useSWR from 'swr';
import type { Note, NoteCategory } from '@shared/types';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { Alert, Avatar, Badge, EmptyState, Skeleton } from '@/components/ui/Feedback';
import { IconNote, IconTrash } from '@/components/ui/Icons';
import { Segmented } from '@/components/ui/Segmented';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

const CATEGORY_LABELS: Record<NoteCategory, string> = {
  wish: 'Wunsch',
  idea: 'Idee',
  requirement: 'Anforderung',
};

const CATEGORY_TONES: Record<NoteCategory, 'accent' | 'success' | 'warning'> = {
  wish: 'accent',
  idea: 'success',
  requirement: 'warning',
};

const PLACEHOLDERS: Record<NoteCategory, string> = {
  wish: 'z. B. Sauna, Kamin oder Bergblick wären toll',
  idea: 'z. B. Am Samstag eine Schneeschuhwanderung machen',
  requirement: 'z. B. Wir brauchen mindestens drei Schlafzimmer',
};

export function NotesTab({ tripId, myParticipantId }: { tripId: string; myParticipantId: string }) {
  const { toast } = useToast();
  const key = `/trips/${tripId}/notes`;
  const { data, error, isLoading, mutate } = useSWR<{ notes: Note[] }>(key);

  const [category, setCategory] = useState<NoteCategory>('wish');
  const [content, setContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    setFormError(null);
    setSaving(true);
    try {
      await apiFetch(key, { method: 'POST', body: { category, content: content.trim() } });
      setContent('');
      await mutate();
      toast('Notiz gespeichert', 'success');
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(note: Note) {
    setDeletingId(note.id);
    try {
      await apiFetch(`${key}/${note.id}`, { method: 'DELETE' });
      await mutate();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-title2">Wünsche &amp; Ideen</h2>
        <p className="mt-1 text-callout text-secondary">
          Sag deiner Gruppe, worauf du Wert legst. Häufige Wünsche fließen in die Unterkunftssuche ein.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-5 p-5 sm:p-6" noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}
        <Segmented
          ariaLabel="Art der Notiz"
          value={category}
          onChange={setCategory}
          options={(Object.keys(CATEGORY_LABELS) as NoteCategory[]).map((value) => ({
            value,
            label: CATEGORY_LABELS[value],
          }))}
        />
        <Textarea
          label="Deine Notiz"
          rows={3}
          maxLength={1000}
          placeholder={PLACEHOLDERS[category]}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          hint={`${content.length}/1000`}
        />
        <Button type="submit" loading={saving} disabled={!content.trim()}>
          Notiz speichern
        </Button>
      </form>

      <section aria-label="Alle Notizen" className="space-y-3">
        {isLoading && <Skeleton className="h-24" />}
        {error && <Alert tone="error">{errorMessage(error)}</Alert>}
        {data && data.notes.length === 0 && (
          <div className="card">
            <EmptyState icon={<IconNote size={26} />} title="Noch keine Notizen">
              Sei die erste Person, die einen Wunsch oder eine Idee teilt.
            </EmptyState>
          </div>
        )}
        {data && data.notes.length > 0 && (
          <ul className="space-y-3">
            {data.notes.map((note) => (
              <li key={note.id} className="card flex gap-3.5 p-5">
                <Avatar name={note.author_name} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <p className="text-callout font-semibold">{note.author_name ?? 'Unbekannt'}</p>
                    <Badge tone={CATEGORY_TONES[note.category]}>{CATEGORY_LABELS[note.category]}</Badge>
                    <span className="text-footnote text-secondary">{formatDateTime(note.created_at)}</span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-line break-words text-callout">{note.content}</p>
                </div>
                {note.trip_user_id === myParticipantId && (
                  <button
                    type="button"
                    onClick={() => remove(note)}
                    disabled={deletingId === note.id}
                    aria-label="Notiz löschen"
                    className="h-9 w-9 shrink-0 rounded-full text-secondary transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                  >
                    <IconTrash size={18} className="mx-auto" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
