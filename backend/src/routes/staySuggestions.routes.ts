import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireParticipantAuth, requireTripCreatorParticipant } from '../middleware/auth';
import {
  addStaySuggestion,
  listStaySuggestions,
  deleteStaySuggestion,
  selectStaySuggestion,
} from '../controllers/staySuggestions.controller';

const router = Router({ mergeParams: true });

router.use(requireParticipantAuth);
router.post('/', asyncHandler(addStaySuggestion));
router.get('/', asyncHandler(listStaySuggestions));
router.delete('/:suggestionId', asyncHandler(deleteStaySuggestion));
router.post('/:suggestionId/select', requireTripCreatorParticipant, asyncHandler(selectStaySuggestion));

export default router;
