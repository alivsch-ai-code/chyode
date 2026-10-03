import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireParticipantAuth } from '../middleware/auth';
import { addDonation, deleteDonation, listDonations } from '../controllers/donations.controller';

const router = Router({ mergeParams: true });

router.use(requireParticipantAuth);
router.post('/', asyncHandler(addDonation));
router.get('/', asyncHandler(listDonations));
router.delete('/:donationId', asyncHandler(deleteDonation));

export default router;
