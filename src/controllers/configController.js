import asyncHandler from 'express-async-handler';
import Config from '../models/Config.js';

const HTML_RELEASE_KEY = 'htmlReleaseDay';
const DAILY_QUIZ_START_DATE_KEY = 'dailyQuizStartDate';
const DEFAULT_DAILY_QUIZ_START_DATE = '2026-07-14';

export const getHtmlReleaseDay = asyncHandler(async (req, res) => {
  let config = await Config.findOne({ key: HTML_RELEASE_KEY });

  if (!config) {
    config = await Config.create({ key: HTML_RELEASE_KEY, value: 0 });
  }

  res.json({ value: config.value });
});

export const updateHtmlReleaseDay = asyncHandler(async (req, res) => {
  const { value } = req.body;

  if (typeof value !== 'number' || value < 0) {
    res.status(400);
    throw new Error('Invalid htmlReleaseDay value');
  }

  const config = await Config.findOneAndUpdate(
    { key: HTML_RELEASE_KEY },
    { value },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ value: config.value });
});

export const getDailyQuizStartDate = asyncHandler(async (req, res) => {
  let config = await Config.findOne({ key: DAILY_QUIZ_START_DATE_KEY });

  if (!config) {
    config = await Config.create({
      key: DAILY_QUIZ_START_DATE_KEY,
      value: DEFAULT_DAILY_QUIZ_START_DATE,
    });
  }

  res.json({ value: config.value });
});

export const updateDailyQuizStartDate = asyncHandler(async (req, res) => {
  const { value } = req.body;

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    res.status(400);
    throw new Error('Invalid dailyQuizStartDate value');
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    res.status(400);
    throw new Error('Invalid dailyQuizStartDate value');
  }

  const config = await Config.findOneAndUpdate(
    { key: DAILY_QUIZ_START_DATE_KEY },
    { value },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ value: config.value });
});
