import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireParticipantAuth } from '../middleware/auth';
import { getMyPreferences, saveMyPreferences } from '../controllers/preferences.controller';

const router = Router({ mergeParams: true });

router.use(requireParticipantAuth);
router.get('/me', asyncHandler(getMyPreferences));
router.put('/', asyncHandler(saveMyPreferences));

export default router;
