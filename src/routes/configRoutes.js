import express from 'express';
import { getHtmlReleaseDay, updateHtmlReleaseDay } from '../controllers/configController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/html-release-day', getHtmlReleaseDay);
router.put('/html-release-day', protect, admin, updateHtmlReleaseDay);

export default router;
