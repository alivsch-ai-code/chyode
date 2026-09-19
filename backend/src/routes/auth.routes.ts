import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import {
  login,
  logout,
  getCurrentUser,
  updateProfile,
  changePassword,
  getInvite,
  acceptInvite,
  forgotPassword,
  checkResetToken,
  resetPassword,
} from '../controllers/auth.controller';

const router = Router();

router.post('/login', asyncHandler(login));
router.post('/logout', asyncHandler(logout));

router.get('/me', requireAuth, asyncHandler(getCurrentUser));
router.patch('/me', requireAuth, asyncHandler(updateProfile));
router.post('/change-password', requireAuth, asyncHandler(changePassword));

router.get('/invite/:token', asyncHandler(getInvite));
router.post('/accept-invite', asyncHandler(acceptInvite));

router.post('/forgot-password', asyncHandler(forgotPassword));
router.get('/reset/:token', asyncHandler(checkResetToken));
router.post('/reset-password', asyncHandler(resetPassword));

export default router;
