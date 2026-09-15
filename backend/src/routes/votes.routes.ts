import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireParticipantAuth } from '../middleware/auth';
import { castVote, removeVote, listVotes, listMyVotes } from '../controllers/votes.controller';

const router = Router({ mergeParams: true });

router.use(requireParticipantAuth);
router.post('/', asyncHandler(castVote));
router.get('/', asyncHandler(listVotes));
router.get('/me', asyncHandler(listMyVotes));
router.delete('/:dateOptionId', asyncHandler(removeVote));

export default router;
