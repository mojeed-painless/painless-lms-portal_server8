import asyncHandler from 'express-async-handler';
import Config from '../models/Config.js';

const HTML_RELEASE_KEY = 'htmlReleaseDay';

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
