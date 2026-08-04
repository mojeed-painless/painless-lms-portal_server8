import express from 'express';
import {
	getHtmlReleaseDay,
	updateHtmlReleaseDay,
	getDailyQuizStartDate,
	updateDailyQuizStartDate,
} from '../controllers/configController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/html-release-day', getHtmlReleaseDay);
router.put('/html-release-day', protect, admin, updateHtmlReleaseDay);
router.get('/daily-quiz-start-date', getDailyQuizStartDate);
router.put('/daily-quiz-start-date', protect, admin, updateDailyQuizStartDate);

export default router;
