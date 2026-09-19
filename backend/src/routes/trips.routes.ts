import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, requireParticipantAuth, requireTripCreatorParticipant } from '../middleware/auth';
import {
  createTrip,
  listMyTrips,
  getTrip,
  getTripByInviteToken,
  joinTrip,
  closeVoting,
  reopenVoting,
  releaseResults,
  hideResults,
  deleteTrip,
} from '../controllers/trips.controller';

const router = Router();

// Trips des angemeldeten Accounts
router.post('/', requireAuth, asyncHandler(createTrip));
router.get('/', requireAuth, asyncHandler(listMyTrips));

// Einladungslink: Vorschau ist öffentlich, Beitritt erfordert ein Konto
router.get('/invite/:inviteToken', asyncHandler(getTripByInviteToken));
router.post('/invite/:inviteToken/join', requireAuth, asyncHandler(joinTrip));

// Trip-scoped Endpoints (nur Mitglieder)
router.get('/:tripId', requireParticipantAuth, asyncHandler(getTrip));
router.post(
  '/:tripId/close-voting',
  requireParticipantAuth,
  requireTripCreatorParticipant,
  asyncHandler(closeVoting)
);
router.post(
  '/:tripId/reopen-voting',
  requireParticipantAuth,
  requireTripCreatorParticipant,
  asyncHandler(reopenVoting)
);
router.post(
  '/:tripId/release-results',
  requireParticipantAuth,
  requireTripCreatorParticipant,
  asyncHandler(releaseResults)
);
router.post(
  '/:tripId/hide-results',
  requireParticipantAuth,
  requireTripCreatorParticipant,
  asyncHandler(hideResults)
);
router.delete('/:tripId', requireParticipantAuth, requireTripCreatorParticipant, asyncHandler(deleteTrip));

export default router;
