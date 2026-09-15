'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { apiFetch } from '@/lib/api';
import type { Note, NoteCategory } from '@shared/types';

const CATEGORY_LABELS: Record<NoteCategory, string> = {
  wish: 'Wunsch',
  idea: 'Idee',
  requirement: 'Anforderung',
};

export function NoteForm({ tripId }: { tripId: string }) {
  const { data, mutate } = useSWR<{ notes: Note[] }>(`/trips/${tripId}/notes`, () =>
    apiFetch<{ notes: Note[] }>(`/trips/${tripId}/notes`, { tripId })
  );
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoteCategory>('wish');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch(`/trips/${tripId}/notes`, {
        method: 'POST',
        tripId,
        body: { category, content },
      });
      setContent('');
      mutate();
    } finally {
      setSubmitting(false);
    }
  }

  const notes = data?.notes ?? [];

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="card space-y-3">
        <div className="flex gap-2">
          {(Object.keys(CATEGORY_LABELS) as NoteCategory[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={
                category === c
                  ? 'rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white'
                  : 'rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600'
              }
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <textarea
          className="input min-h-[80px]"
          placeholder="z.B. Sauna wäre toll, oder: wir brauchen mindestens 3 Schlafzimmer"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button type="submit" disabled={submitting} className="btn-primary">
          Notiz hinzufügen
        </button>
      </form>

      <div className="space-y-2">
        {notes.map((note) => (
          <div key={note.id} className="card flex items-start justify-between gap-3">
            <div>
              <span className="mb-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {CATEGORY_LABELS[note.category]}
              </span>
              <p className="text-sm">{note.content}</p>
            </div>
            {note.author_name && <span className="shrink-0 text-xs text-slate-400">{note.author_name}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
