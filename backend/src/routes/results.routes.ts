import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireParticipantAuth } from '../middleware/auth';
import { getTripResults } from '../controllers/results.controller';

const router = Router({ mergeParams: true });

router.use(requireParticipantAuth);
router.get('/', asyncHandler(getTripResults));

export default router;
