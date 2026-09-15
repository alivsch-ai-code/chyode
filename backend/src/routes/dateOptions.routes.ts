import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireParticipantAuth } from '../middleware/auth';
import { addDateOption, listDateOptions } from '../controllers/dateOptions.controller';

// mergeParams, damit :tripId aus dem Parent-Router verfügbar ist
const router = Router({ mergeParams: true });

router.use(requireParticipantAuth);
router.post('/', asyncHandler(addDateOption));
router.get('/', asyncHandler(listDateOptions));

export default router;
