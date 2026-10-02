import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireParticipantAuth } from '../middleware/auth';
import { addActivity, listActivities, deleteActivity } from '../controllers/activities.controller';

const router = Router({ mergeParams: true });

router.use(requireParticipantAuth);
router.post('/', asyncHandler(addActivity));
router.get('/', asyncHandler(listActivities));
router.delete('/:activityId', asyncHandler(deleteActivity));

export default router;
