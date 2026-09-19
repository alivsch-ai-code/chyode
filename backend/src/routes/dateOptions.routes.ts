import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireParticipantAuth } from '../middleware/auth';
import { addDateOptions, listDateOptions, deleteDateOption } from '../controllers/dateOptions.controller';

// mergeParams, damit :tripId aus dem Parent-Router verfügbar ist
const router = Router({ mergeParams: true });

router.use(requireParticipantAuth);
router.post('/', asyncHandler(addDateOptions));
router.get('/', asyncHandler(listDateOptions));
router.delete('/:dateOptionId', asyncHandler(deleteDateOption));

export default router;
