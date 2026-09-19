import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAdmin } from '../middleware/auth';
import {
  listUsers,
  updateUser,
  listInvites,
  createInvite,
  resendInvite,
  revokeInvite,
} from '../controllers/admin.controller';

const router = Router();

router.use(requireAdmin);

router.get('/users', asyncHandler(listUsers));
router.patch('/users/:id', asyncHandler(updateUser));

router.get('/invites', asyncHandler(listInvites));
router.post('/invites', asyncHandler(createInvite));
router.post('/invites/:id/resend', asyncHandler(resendInvite));
router.delete('/invites/:id', asyncHandler(revokeInvite));

export default router;
