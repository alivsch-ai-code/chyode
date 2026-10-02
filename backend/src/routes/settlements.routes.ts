import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireParticipantAuth } from '../middleware/auth';
import { addSettlement, deleteSettlement, listSettlements } from '../controllers/settlements.controller';

const router = Router({ mergeParams: true });

router.use(requireParticipantAuth);
router.post('/', asyncHandler(addSettlement));
router.get('/', asyncHandler(listSettlements));
router.delete('/:settlementId', asyncHandler(deleteSettlement));

export default router;
