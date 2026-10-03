import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireParticipantAuth, requireTripCreatorParticipant } from '../middleware/auth';
import { addPlaceholder, deletePlaceholder, mergePlaceholder } from '../controllers/placeholders.controller';

const router = Router({ mergeParams: true });

router.use(requireParticipantAuth, requireTripCreatorParticipant);
router.post('/', asyncHandler(addPlaceholder));
router.delete('/:placeholderId', asyncHandler(deletePlaceholder));
router.post('/:placeholderId/merge', asyncHandler(mergePlaceholder));

export default router;
