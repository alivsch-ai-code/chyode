import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireParticipantAuth } from '../middleware/auth';
import {
  addGroceryItem,
  listGroceryItems,
  getGrocerySummary,
  toggleGroceryItem,
  toggleClaim,
  deleteGroceryItem,
} from '../controllers/groceries.controller';

const router = Router({ mergeParams: true });

router.use(requireParticipantAuth);
router.post('/', asyncHandler(addGroceryItem));
router.get('/', asyncHandler(listGroceryItems));
router.get('/summary', asyncHandler(getGrocerySummary));
router.patch('/:itemId/toggle', asyncHandler(toggleGroceryItem));
router.patch('/:itemId/claim', asyncHandler(toggleClaim));
router.delete('/:itemId', asyncHandler(deleteGroceryItem));

export default router;
