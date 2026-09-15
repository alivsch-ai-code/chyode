import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireCreatorAuth } from '../middleware/auth';
import { requestMagicLink, verifyMagicLink, getCurrentUser } from '../controllers/auth.controller';

const router = Router();

router.post('/magic-link', asyncHandler(requestMagicLink));
router.get('/verify', asyncHandler(verifyMagicLink));
router.get('/me', requireCreatorAuth, asyncHandler(getCurrentUser));

export default router;
