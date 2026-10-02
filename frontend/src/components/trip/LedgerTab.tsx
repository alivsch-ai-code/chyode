'use client';

import { useState, type FormEvent } from 'react';
import useSWR from 'swr';
import type { LedgerSummary, Trip, TripExpense, TripParticipant, TripSettlement } from '@shared/types';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Alert, Avatar, Badge, EmptyState, Skeleton } from '@/components/ui/Feedback';
import { IconCheck, IconReceipt, IconScale, IconTrash } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { API_URL, apiFetch, errorMessage } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';

export function LedgerTab({
  tripId,
  trip,
  myParticipantId,
  participants,
}: {
  tripId: string;
  trip: Trip;
  myParticipantId: string;
  participants: TripParticipant[];
}) {
  const { toast } = useToast();
  const ledgerKey = `/trips/${tripId}/balances`;
  const expensesKey = `/trips/${tripId}/expenses`;
  const settlementsKey = `/trips/${tripId}/settlements`;

  const { data: ledger, mutate: mutateLedger } = useSWR<LedgerSummary>(ledgerKey);
  const { data: expensesData, mutate: mutateExpenses } = useSWR<{ expenses: TripExpense[] }>(expensesKey);
  const { data: settlementsData, mutate: mutateSettlements } = useSWR<{ settlements: TripSettlement[] }>(settlementsKey);

  const refreshAll = () => Promise.all([mutateLedger(), mutateExpenses(), mutateSettlements()]);

  const otherParticipants = participants.filter((p) => p.id !== myParticipantId);
  const nameById = Object.fromEntries(participants.map((p) => [p.id, p.name]));

  // -- Ausgabe eintragen -------------------------------------------------
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(myParticipantId);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [savingExpense, setSavingExpense] = useState(false);
  const [busyExpenseId, setBusyExpenseId] = useState<string | null>(null);

  async function onAddExpense(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount.replace(',', '.'));
    if (!description.trim() || !(value > 0)) return;
    setExpenseError(null);
    setSavingExpense(true);
    try {
      const form = new FormData();
      form.set('description', description.trim());
      form.set('amount', String(value));
      if (paidBy !== myParticipantId) form.set('paidBy', paidBy);
      if (receipt) form.set('receipt', receipt);
      await apiFetch(expensesKey, { method: 'POST', body: form });
      setDescription('');
      setAmount('');
      setPaidBy(myParticipantId);
      setReceipt(null);
      await refreshAll();
      toast('Ausgabe eingetragen', 'success');
    } catch (err) {
      setExpenseError(errorMessage(err));
    } finally {
      setSavingExpense(false);
    }
  }

  async function removeExpense(expense: TripExpense) {
    setBusyExpenseId(expense.id);
    try {
      await apiFetch(`${expensesKey}/${expense.id}`, { method: 'DELETE' });
      await refreshAll();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyExpenseId(null);
    }
  }

  // -- Zahlung eintragen (manuelles Begleichen) --------------------------
  const [settleTo, setSettleTo] = useState(otherParticipants[0]?.id ?? '');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [settleError, setSettleError] = useState<string | null>(null);
  const [savingSettlement, setSavingSettlement] = useState(false);
  const [busySettlementId, setBusySettlementId] = useState<string | null>(null);

  async function recordSettlement(toTripUserId: string, value: number, note?: string) {
    await apiFetch(settlementsKey, { method: 'POST', body: { toTripUserId, amount: value, note } });
    await refreshAll();
  }

  async function onAddSettlement(event: FormEvent) {
    event.preventDefault();
    const value = Number(settleAmount.replace(',', '.'));
    if (!settleTo || !(value > 0)) return;
    setSettleError(null);
    setSavingSettlement(true);
    try {
      await recordSettlement(settleTo, value, settleNote.trim() || undefined);
      setSettleAmount('');
      setSettleNote('');
      toast('Zahlung eingetragen', 'success');
    } catch (err) {
      setSettleError(errorMessage(err));
    } finally {
      setSavingSettlement(false);
    }
  }

  async function acceptSuggestion(toTripUserId: string, value: number) {
    setBusySettlementId(toTripUserId);
    try {
      await recordSettlement(toTripUserId, value);
      toast('Als bezahlt markiert', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusySettlementId(null);
    }
  }

  async function removeSettlement(settlement: TripSettlement) {
    setBusySettlementId(settlement.id);
    try {
      await apiFetch(`${settlementsKey}/${settlement.id}`, { method: 'DELETE' });
      await refreshAll();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusySettlementId(null);
    }
  }

  const accommodationAmount = trip.accommodation_total_price ? Number(trip.accommodation_total_price) : null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-title2">Kasse</h2>
        <p className="mt-1 text-callout text-secondary">
          Unterkunft, abgehakte Einkäufe und eingetragene Ausgaben fließen automatisch zusammen – hier siehst du, wer
          wem noch was schuldet.
        </p>
      </div>

      <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="balance-heading">
        <h3 id="balance-heading" className="text-headline">
          Salden
        </h3>
        {!ledger ? (
          <Skeleton className="h-24" />
        ) : (
          <>
            <ul className="space-y-2.5">
              {ledger.balances.map((b) => (
                <li key={b.tripUserId} className="flex items-center gap-3">
                  <Avatar name={b.name} size={32} />
                  <span className="min-w-0 flex-1 truncate text-callout font-medium">{b.name}</span>
                  <Badge tone={b.balance > 0.01 ? 'success' : b.balance < -0.01 ? 'warning' : 'neutral'}>
                    {b.balance > 0.01
                      ? `bekommt ${formatMoney(b.balance)}`
                      : b.balance < -0.01
                        ? `schuldet ${formatMoney(-b.balance)}`
                        : 'ausgeglichen'}
                  </Badge>
                </li>
              ))}
            </ul>
            <p className="text-footnote text-secondary">Insgesamt erfasst: {formatMoney(ledger.totalExpenses)}</p>
            {ledger.settled && ledger.totalExpenses > 0 && (
              <Alert tone="success" title="Alle Schulden beglichen">
                <span className="inline-flex items-center gap-1.5">
                  <IconCheck size={15} /> Niemand schuldet mehr etwas.
                </span>
              </Alert>
            )}
            {!ledger.settled && ledger.suggestions.length > 0 && (
              <div className="space-y-2 border-t border-line/60 pt-4">
                <h4 className="text-subhead font-medium">Vorschlag zum Ausgleichen</h4>
                <ul className="space-y-2">
                  {ledger.suggestions.map((s) => (
                    <li
                      key={`${s.fromTripUserId}-${s.toTripUserId}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-grouped px-3.5 py-2.5"
                    >
                      <span className="text-callout">
                        <span className="font-medium">{s.fromName}</span> zahlt{' '}
                        <span className="font-medium">{s.toName}</span> {formatMoney(s.amount)}
                      </span>
                      <Button
                        size="sm"
                        variant="tinted"
                        loading={busySettlementId === s.toTripUserId}
                        onClick={() => acceptSuggestion(s.toTripUserId, s.amount)}
                      >
                        Als bezahlt markieren
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="expenses-heading">
        <h3 id="expenses-heading" className="text-headline">
          Ausgaben
        </h3>

        {accommodationAmount !== null && (
          <div className="flex items-center justify-between rounded-control bg-grouped px-3.5 py-3">
            <div>
              <p className="text-callout font-medium">Unterkunft</p>
              <p className="text-footnote text-secondary">
                bezahlt von {nameById[trip.accommodation_paid_by ?? ''] ?? '–'} · im Tab „Unterkünfte" bearbeiten
              </p>
            </div>
            <span className="text-callout font-semibold">{formatMoney(accommodationAmount)}</span>
          </div>
        )}

        <form onSubmit={onAddExpense} className="space-y-4" noValidate encType="multipart/form-data">
          {expenseError && <Alert tone="error">{expenseError}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Wofür?"
              placeholder="z. B. Taxi, Konzertkarten"
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Input
              label="Betrag"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="in Euro"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Wer hat bezahlt?" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id === myParticipantId ? `${p.name} (du)` : p.name}
                </option>
              ))}
            </Select>
            <div>
              <label className="mb-1.5 block text-subhead font-medium text-label">
                Beleg <span className="ml-1.5 font-normal text-secondary">optional</span>
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                className="block w-full text-footnote text-secondary file:mr-3 file:rounded-full file:border-0 file:bg-fill/15 file:px-4 file:py-2 file:text-subhead file:font-medium file:text-label"
              />
            </div>
          </div>
          <Button type="submit" loading={savingExpense} disabled={!description.trim() || !amount}>
            Ausgabe eintragen
          </Button>
        </form>

        {!expensesData ? (
          <Skeleton className="h-16" />
        ) : expensesData.expenses.length === 0 ? (
          <div className="pt-1">
            <EmptyState icon={<IconReceipt size={24} />} title="Noch keine Ausgaben">
              Trag eine Ausgabe ein, sobald jemand etwas für die Gruppe bezahlt hat.
            </EmptyState>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {expensesData.expenses.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-control bg-grouped px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-callout font-medium">{e.description}</p>
                  <p className="text-footnote text-secondary">
                    {e.paid_by_name} · {formatDateTime(e.created_at)}
                  </p>
                </div>
                {e.hasReceipt && (
                  <a
                    href={`${API_URL}/trips/${tripId}/expenses/${e.id}/receipt`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Beleg ansehen"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-secondary transition hover:bg-fill/15 hover:text-label"
                  >
                    <IconReceipt size={18} />
                  </a>
                )}
                <span className="shrink-0 text-callout font-semibold">{formatMoney(Number(e.amount))}</span>
                <button
                  type="button"
                  onClick={() => removeExpense(e)}
                  disabled={busyExpenseId === e.id}
                  aria-label="Ausgabe löschen"
                  className="h-9 w-9 shrink-0 rounded-full text-secondary transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                >
                  <IconTrash size={18} className="mx-auto" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {otherParticipants.length > 0 && (
        <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="settle-heading">
          <h3 id="settle-heading" className="text-headline">
            Zahlung eintragen
          </h3>
          <p className="text-footnote text-secondary">
            Hast du schon bar oder per Überweisung bezahlt? Trag es hier ein, dann stimmen die Salden wieder.
          </p>
          <form onSubmit={onAddSettlement} className="space-y-4" noValidate>
            {settleError && <Alert tone="error">{settleError}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="An wen hast du gezahlt?" value={settleTo} onChange={(e) => setSettleTo(e.target.value)}>
                {otherParticipants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Betrag"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="in Euro"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
              />
            </div>
            <Textarea
              label="Notiz"
              optional
              rows={2}
              maxLength={300}
              placeholder="z. B. Bar beim Frühstück"
              value={settleNote}
              onChange={(e) => setSettleNote(e.target.value)}
            />
            <Button type="submit" loading={savingSettlement} disabled={!settleTo || !settleAmount}>
              Zahlung eintragen
            </Button>
          </form>

          {settlementsData && settlementsData.settlements.length > 0 && (
            <ul className="space-y-2 border-t border-line/60 pt-4">
              {settlementsData.settlements.map((s) => (
                <li key={s.id} className="flex items-center gap-3 text-callout">
                  <IconScale size={16} className="shrink-0 text-secondary" />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{s.from_name}</span> zahlte <span className="font-medium">{s.to_name}</span>{' '}
                    {formatMoney(Number(s.amount))}
                    {s.note && <span className="text-secondary"> · {s.note}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSettlement(s)}
                    disabled={busySettlementId === s.id}
                    aria-label="Zahlung entfernen"
                    className="h-8 w-8 shrink-0 rounded-full text-secondary transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                  >
                    <IconTrash size={16} className="mx-auto" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
