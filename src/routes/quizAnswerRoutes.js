import express from 'express';
import { submitAnswer, getMyAnswers } from '../controllers/quizAnswerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, submitAnswer);
router.get('/', protect, getMyAnswers);

export default router;
