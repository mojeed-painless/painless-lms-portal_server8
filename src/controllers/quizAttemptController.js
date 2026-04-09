import asyncHandler from 'express-async-handler';
import QuizAttempt from '../models/QuizAttempt.js';
import StudentAnswer from '../models/StudentAnswer.js';
import DailyQuizAttempt from '../models/DailyQuizAttempt.js';
import DailyQuizSession from '../models/DailyQuizSession.js';
import User from '../models/User.js';

// @desc  Create a quiz attempt record
// @route POST /api/quiz-attempts
// @access Private
const createAttempt = asyncHandler(async (req, res) => {
  const { topic, score, total, timeTaken } = req.body;
  if (!topic || typeof score === 'undefined' || typeof total === 'undefined' || typeof timeTaken === 'undefined') {
    res.status(400);
    throw new Error('Missing required fields');
  }

  const attempt = await QuizAttempt.create({
    student: req.user._id,
    topic,
    score,
    total,
    timeTaken,
  });

  res.status(201).json(attempt);
});

// @desc  Get current user's quiz attempts
// @route GET /api/quiz-attempts
// @access Private
const getMyAttempts = asyncHandler(async (req, res) => {
  const attempts = await QuizAttempt.find({ student: req.user._id }).sort({ attemptedAt: -1 });
  res.json(attempts);
});


// @desc  Submit a batch of answers and create a quiz attempt (daily quiz finish)
// @route POST /api/quiz-attempts/submit
// @access Private
const submitBatchAttempt = asyncHandler(async (req, res) => {
  const { topic, answers, timeTaken, date } = req.body;

  if (!Array.isArray(answers) || answers.length === 0) {
    res.status(400);
    throw new Error('Answers array is required');
  }

  // Determine whether this is a daily quiz. For daily quizzes we use a date string
  // (YYYY-MM-DD) as the topic so answers/attempts are uniquely keyed by date.
  const isDaily = !topic || topic === 'daily';
  const attemptDate = isDaily ? (date ? date : new Date().toISOString().slice(0, 10)) : null;
  const attemptTopic = isDaily ? attemptDate : topic;

  // If daily quiz, ensure the student hasn't already submitted for this date
  if (isDaily) {
    const existing = await DailyQuizAttempt.findOne({ student: req.user._id, date: attemptDate }).exec();
    if (existing) {
      res.status(409);
      return res.json({ message: 'Daily attempt already exists', attempt: existing });
    }
  }

  // Upsert each answer (student, topic, questionId)
  const ops = answers.map(a => {
    const filter = { student: req.user._id, topic: attemptTopic, questionId: String(a.questionId) };
    const update = {
      questionText: a.questionText || '',
      selectedOption: a.selectedOption,
      correctAnswer: a.correctAnswer || null,
      isCorrect: typeof a.correctAnswer !== 'undefined' ? (a.selectedOption === a.correctAnswer) : false,
      submittedAt: Date.now(),
    };
    const options = { new: true, upsert: true, setDefaultsOnInsert: true };
    return StudentAnswer.findOneAndUpdate(filter, update, options).exec();
  });

  const savedAnswers = await Promise.all(ops);

  // Calculate score based on savedAnswers
  const total = savedAnswers.length;
  const score = savedAnswers.reduce((acc, a) => acc + (a.isCorrect ? 1 : 0), 0);

  if (isDaily) {
    // Create a DailyQuizAttempt record (single attempt per student+date enforced above)
    const dailyAttempt = await DailyQuizAttempt.create({
      student: req.user._id,
      date: attemptDate,
      score,
      total,
      timeTaken: typeof timeTaken === 'number' ? timeTaken : 0,
    });

    // Recalculate points for all attempts on this date based on new rankings
    const allAttemptsForDate = await DailyQuizAttempt.find({ date: attemptDate })
      .sort({ score: -1, timeTaken: 1, attemptedAt: 1 });

    // Update points for each attempt based on new rank
    const updateOps = allAttemptsForDate.map(async (attempt, index) => {
      const rank = index + 1;
      let rankBonus = 0;
      if (rank === 1) rankBonus = 5;
      else if (rank === 2) rankBonus = 3;
      else if (rank === 3) rankBonus = 1;

      const points = rankBonus + attempt.score;
      attempt.points = points;
      return attempt.save();
    });

    await Promise.all(updateOps);

    // Fetch the updated daily attempt to return the latest points
    const updatedAttempt = await DailyQuizAttempt.findById(dailyAttempt._id);
    return res.status(201).json({ attempt: updatedAttempt, savedAnswers });
  }

  const attempt = await QuizAttempt.create({
    student: req.user._id,
    topic: attemptTopic,
    score,
    total,
    timeTaken: typeof timeTaken === 'number' ? timeTaken : 0,
  });

  res.status(201).json({ attempt, savedAnswers });
});

export { createAttempt, getMyAttempts, submitBatchAttempt };

// @desc  Get top N daily leaderboard for a given date
// @route GET /api/quiz-attempts/leaderboard/daily
// @access Public
const getDailyLeaderboard = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().slice(0, 10);

  // Sort: higher score first, then lower timeTaken
  const top = await DailyQuizAttempt.find({ date: targetDate })
    .sort({ score: -1, timeTaken: 1, attemptedAt: 1 })
    .limit(3)
    .populate('student', 'firstName lastName username')
    .lean();

  // Map to simple shape
  const result = top.map((t, idx) => ({
    rank: idx + 1,
    studentId: t.student?._id || null,
    name: t.student ? `${t.student.firstName} ${t.student.lastName}` : 'Unknown',
    username: t.student?.username || '',
    score: t.score,
    total: t.total,
    timeTaken: t.timeTaken,
    points: t.points || 0,
    attemptedAt: t.attemptedAt,
  }));

  res.json({ date: targetDate, top: result });
});

export { getDailyLeaderboard };

// @desc Get aggregated daily quiz leaderboard (total points across all dates)
// @route GET /api/quiz-attempts/leaderboard/daily/aggregate
// @access Public
const getDailyLeaderboardAggregate = asyncHandler(async (req, res) => {
  // Aggregate all DailyQuizAttempt records by student, summing their points
  const aggregated = await DailyQuizAttempt.aggregate([
    {
      $group: {
        _id: '$student',
        totalPoints: { $sum: '$points' },
        totalAttempts: { $sum: 1 },
      },
    },
    {
      $sort: { totalPoints: -1 },
    },
  ]);

  // Now fetch user info for each student
  const result = await Promise.all(
    aggregated.map(async (item, idx) => {
      const student = await User.findById(item._id).lean();
      return {
        rank: idx + 1,
        studentId: item._id || null,
        name: student ? `${student.firstName} ${student.lastName}`.trim() : 'Unknown',
        username: student?.username || '',
        totalPoints: item.totalPoints || 0,
        totalAttempts: item.totalAttempts || 0,
      };
    })
  );

  res.json(result);
});

export { getDailyLeaderboardAggregate };

// @desc Get session info (start/end) for a given date
// @route GET /api/quiz-attempts/session
// @access Public
const getDailySession = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().slice(0, 10);
  const session = await DailyQuizSession.findOne({ date: targetDate }).lean();
  const now = new Date();

  if (!session) {
    return res.json({ date: targetDate, now: now.toISOString(), isLive: false });
  }

  const isLive = now >= new Date(session.startAt) && now < new Date(session.endAt);
  res.json({ date: targetDate, startAt: session.startAt, endAt: session.endAt, now: now.toISOString(), isLive });
});

// @desc Create or update session for a date (admin)
// @route POST /api/quiz-attempts/session
// @access Admin
const upsertDailySession = asyncHandler(async (req, res) => {
  const { date, startAt, endAt } = req.body;
  if (!date || !startAt || !endAt) {
    res.status(400);
    throw new Error('date, startAt and endAt are required');
  }

  const filter = { date };
  const update = { startAt: new Date(startAt), endAt: new Date(endAt) };
  const options = { new: true, upsert: true, setDefaultsOnInsert: true };

  const session = await DailyQuizSession.findOneAndUpdate(filter, update, options).exec();
  res.json(session);
});

export { getDailySession, upsertDailySession };

// @desc Get current user's daily attempt (by date)
// @route GET /api/quiz-attempts/daily
// @access Private
const getMyDailyAttempt = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().slice(0, 10);
  const attempt = await DailyQuizAttempt.findOne({ student: req.user._id, date: targetDate });
  if (!attempt) {
    res.status(404).json({ message: 'No attempt for this date' });
    return;
  }
  res.json(attempt);
});

export { getMyDailyAttempt };
