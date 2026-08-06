import express from 'express';
import { createAttempt, getMyAttempts, submitBatchAttempt, getDailyLeaderboard, getDailyLeaderboardAggregate, getMyDailyAttempt, getMyDailyQuizSummary, getDailySession, upsertDailySession } from '../controllers/quizAttemptController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, createAttempt).get(protect, getMyAttempts);
router.route('/submit').post(protect, submitBatchAttempt);
router.route('/leaderboard/daily/aggregate').get(getDailyLeaderboardAggregate);
router.route('/leaderboard/daily').get(getDailyLeaderboard);
router.route('/daily').get(protect, getMyDailyAttempt);
// Protected route to return the current user's daily quiz summary
router.route('/daily/summary').get(protect, getMyDailyQuizSummary);
router.route('/session').get(getDailySession).post(protect, admin, upsertDailySession);

export default router;
