import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireParticipantAuth } from '../middleware/auth';
import { getLedger } from '../controllers/ledger.controller';

const router = Router({ mergeParams: true });

router.use(requireParticipantAuth);
router.get('/', asyncHandler(getLedger));

export default router;
