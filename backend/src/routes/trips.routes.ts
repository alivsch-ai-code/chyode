import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireCreatorAuth, requireParticipantAuth, requireTripCreatorParticipant } from '../middleware/auth';
import {
  createTrip,
  listMyTrips,
  getTrip,
  getTripByInviteToken,
  joinTrip,
  closeVoting,
} from '../controllers/trips.controller';

const router = Router();

// Ersteller-Verwaltung (JWT-Login)
router.post('/', requireCreatorAuth, asyncHandler(createTrip));
router.get('/', requireCreatorAuth, asyncHandler(listMyTrips));

// Öffentliche Einladungs-Endpoints (kein Login nötig)
router.get('/invite/:inviteToken', asyncHandler(getTripByInviteToken));
router.post('/invite/:inviteToken/join', asyncHandler(joinTrip));

// Trip-scoped Endpoints (Teilnehmer-Session-Token)
router.get('/:tripId', requireParticipantAuth, asyncHandler(getTrip));
router.post(
  '/:tripId/close-voting',
  requireParticipantAuth,
  requireTripCreatorParticipant,
  asyncHandler(closeVoting)
);

export default router;
