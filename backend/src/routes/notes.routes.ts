import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireParticipantAuth } from '../middleware/auth';
import { addNote, listNotes, deleteNote } from '../controllers/notes.controller';

const router = Router({ mergeParams: true });

router.use(requireParticipantAuth);
router.post('/', asyncHandler(addNote));
router.get('/', asyncHandler(listNotes));
router.delete('/:noteId', asyncHandler(deleteNote));

export default router;
