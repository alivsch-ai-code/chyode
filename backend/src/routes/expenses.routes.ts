import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireParticipantAuth } from '../middleware/auth';
import { addExpense, deleteExpense, getReceipt, listExpenses, receiptUpload } from '../controllers/expenses.controller';

const router = Router({ mergeParams: true });

router.use(requireParticipantAuth);
router.post('/', receiptUpload, asyncHandler(addExpense));
router.get('/', asyncHandler(listExpenses));
router.get('/:expenseId/receipt', asyncHandler(getReceipt));
router.delete('/:expenseId', asyncHandler(deleteExpense));

export default router;
