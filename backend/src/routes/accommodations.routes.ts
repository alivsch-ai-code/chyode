import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireParticipantAuth } from '../middleware/auth';
import { searchAccommodations, getCachedAccommodations } from '../controllers/accommodations.controller';

const router = Router({ mergeParams: true });

router.use(requireParticipantAuth);
router.post('/search', asyncHandler(searchAccommodations));
router.get('/', asyncHandler(getCachedAccommodations));

export default router;
