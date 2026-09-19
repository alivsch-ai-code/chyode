import { query } from '../db/pool';
import { ParticipantRole } from '../types';
import { forbidden } from '../utils/httpError';

/** Ist die Auswertung des Trips für Teilnehmer freigegeben? */
export async function isResultsReleased(tripId: string): Promise<boolean> {
  const result = await query<{ results_released_at: string | null }>(
    'SELECT results_released_at FROM trips WHERE id = $1',
    [tripId]
  );
  return Boolean(result.rows[0]?.results_released_at);
}

/** Wirft, wenn die Abstimmung des Trips bereits beendet ist. */
export async function assertVotingOpen(tripId: string): Promise<void> {
  const result = await query<{ status: string }>('SELECT status FROM trips WHERE id = $1', [tripId]);
  if (result.rows[0]?.status !== 'voting') {
    throw forbidden('Die Abstimmung ist beendet');
  }
}

/** Darf dieser Teilnehmer die Auswertung sehen? Ersteller immer, alle anderen erst nach Freigabe. */
export async function canSeeResults(participant: { tripId: string; role: ParticipantRole }): Promise<boolean> {
  if (participant.role === 'creator') return true;
  return isResultsReleased(participant.tripId);
}

export async function assertResultsAccess(participant: { tripId: string; role: ParticipantRole }): Promise<void> {
  if (!(await canSeeResults(participant))) {
    throw forbidden('Der Ersteller hat die Auswertung noch nicht freigegeben');
  }
}
