import { query } from '../db/pool';

export interface LedgerBalance {
  tripUserId: string;
  name: string;
  /** positiv = hat Geld vorgestreckt (wird der Gruppe noch ausgezahlt); negativ = schuldet noch */
  balance: number;
}

export interface SettlementSuggestion {
  fromTripUserId: string;
  fromName: string;
  toTripUserId: string;
  toName: string;
  amount: number;
}

export interface LedgerSummary {
  balances: LedgerBalance[];
  suggestions: SettlementSuggestion[];
  totalExpenses: number;
  /** true, wenn alle Salden (nahezu) bei 0 liegen – Grundlage für die automatische Löschung */
  settled: boolean;
}

const EPSILON = 0.01;

/**
 * Berechnet, wer wem wie viel schuldet – live aus drei Quellen, nichts davon wird redundant
 * gespeichert: abgehakte Einkaufslisten-Artikel mit Preis (Zahler = wer abgehakt hat), die
 * Unterkunftskosten (Zahler = wer vorgestreckt hat) und manuelle Ausgaben samt ihrer fest
 * zugeordneten Beteiligten. Manuelle Zahlungen (trip_settlements) gleichen das wieder aus.
 */
export async function computeLedger(tripId: string): Promise<LedgerSummary> {
  const members = await query<{ id: string; name: string }>('SELECT id, name FROM trip_users WHERE trip_id = $1', [
    tripId,
  ]);

  const balance = new Map<string, number>(members.rows.map((m) => [m.id, 0]));
  const allMemberIds = members.rows.map((m) => m.id);

  function applyExpense(payerId: string, amount: number, participantIds: string[]) {
    if (!balance.has(payerId) || participantIds.length === 0) return;
    const share = amount / participantIds.length;
    balance.set(payerId, (balance.get(payerId) ?? 0) + amount);
    for (const pid of participantIds) {
      if (balance.has(pid)) balance.set(pid, (balance.get(pid) ?? 0) - share);
    }
  }

  let totalExpenses = 0;

  const groceries = await query<{ checked_by: string; price: string }>(
    `SELECT checked_by, price FROM grocery_items
     WHERE trip_id = $1 AND checked_at IS NOT NULL AND price IS NOT NULL AND checked_by IS NOT NULL`,
    [tripId]
  );
  for (const g of groceries.rows) {
    const amount = Number(g.price);
    totalExpenses += amount;
    applyExpense(g.checked_by, amount, allMemberIds);
  }

  const trip = await query<{ accommodation_total_price: string | null; accommodation_paid_by: string | null }>(
    'SELECT accommodation_total_price, accommodation_paid_by FROM trips WHERE id = $1',
    [tripId]
  );
  const accommodation = trip.rows[0];
  if (accommodation?.accommodation_total_price && accommodation.accommodation_paid_by) {
    const amount = Number(accommodation.accommodation_total_price);
    totalExpenses += amount;
    applyExpense(accommodation.accommodation_paid_by, amount, allMemberIds);
  }

  const expenses = await query<{ id: string; paid_by: string; amount: string }>(
    'SELECT id, paid_by, amount FROM trip_expenses WHERE trip_id = $1',
    [tripId]
  );
  for (const e of expenses.rows) {
    const participants = await query<{ trip_user_id: string }>(
      'SELECT trip_user_id FROM trip_expense_participants WHERE expense_id = $1',
      [e.id]
    );
    const amount = Number(e.amount);
    totalExpenses += amount;
    applyExpense(
      e.paid_by,
      amount,
      participants.rows.map((p) => p.trip_user_id)
    );
  }

  const settlements = await query<{ from_trip_user_id: string; to_trip_user_id: string; amount: string }>(
    'SELECT from_trip_user_id, to_trip_user_id, amount FROM trip_settlements WHERE trip_id = $1',
    [tripId]
  );
  for (const s of settlements.rows) {
    const amount = Number(s.amount);
    if (balance.has(s.from_trip_user_id)) balance.set(s.from_trip_user_id, (balance.get(s.from_trip_user_id) ?? 0) + amount);
    if (balance.has(s.to_trip_user_id)) balance.set(s.to_trip_user_id, (balance.get(s.to_trip_user_id) ?? 0) - amount);
  }

  const balances: LedgerBalance[] = members.rows.map((m) => ({
    tripUserId: m.id,
    name: m.name,
    balance: Math.round((balance.get(m.id) ?? 0) * 100) / 100,
  }));

  return {
    balances,
    suggestions: simplifyDebts(balances),
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    settled: balances.every((b) => Math.abs(b.balance) < EPSILON),
  };
}

/** Greedy-Algorithmus: bringt alle Salden mit möglichst wenigen Transaktionen auf 0. */
function simplifyDebts(balances: LedgerBalance[]): SettlementSuggestion[] {
  const creditors = balances
    .filter((b) => b.balance > EPSILON)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balance - a.balance);
  const debtors = balances
    .filter((b) => b.balance < -EPSILON)
    .map((b) => ({ ...b, balance: -b.balance }))
    .sort((a, b) => b.balance - a.balance);

  const suggestions: SettlementSuggestion[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const amount = Math.round(Math.min(credit.balance, debt.balance) * 100) / 100;
    if (amount > EPSILON) {
      suggestions.push({
        fromTripUserId: debt.tripUserId,
        fromName: debt.name,
        toTripUserId: credit.tripUserId,
        toName: credit.name,
        amount,
      });
    }
    credit.balance -= amount;
    debt.balance -= amount;
    if (credit.balance < EPSILON) ci += 1;
    if (debt.balance < EPSILON) di += 1;
  }
  return suggestions;
}
