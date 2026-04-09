import asyncHandler from 'express-async-handler';
import StudentAnswer from '../models/StudentAnswer.js';

// @desc    Submit a student's answer for a quiz question
// @route   POST /api/quiz-answers
// @access  Private
const submitAnswer = asyncHandler(async (req, res) => {
  const { topic, questionId, questionText, selectedOption, correctAnswer } = req.body;

  if (!topic || !questionId || !selectedOption) {
    res.status(400);
    throw new Error('Missing required fields');
  }

  const isCorrect = typeof correctAnswer !== 'undefined' ? (selectedOption === correctAnswer) : false;

  // Try to find existing answer for this student + topic + questionId
  const filter = { student: req.user._id, topic, questionId: String(questionId) };

  const update = {
    questionText: questionText || '',
    selectedOption,
    correctAnswer: correctAnswer || null,
    isCorrect,
    submittedAt: Date.now(),
  };

  // Use findOneAndUpdate with upsert to update existing or create new atomically
  const options = { new: true, upsert: true, setDefaultsOnInsert: true };

  const answer = await StudentAnswer.findOneAndUpdate(filter, update, options);

  // If upsert created a new doc, ensure 'student' and 'topic' and 'questionId' are set (they may not be in `update`)
  if (!answer.student || !answer.topic) {
    answer.student = req.user._id;
    answer.topic = topic;
    answer.questionId = String(questionId);
    await answer.save();
  }

  // Return 200 for update, 201 for create is optional — findOneAndUpdate with upsert returns the doc.
  res.json(answer);
});

// @desc    Get current user's answers (optionally filtered by topic)
// @route   GET /api/quiz-answers
// @access  Private
const getMyAnswers = asyncHandler(async (req, res) => {
  const { topic } = req.query;
  const filter = { student: req.user._id };
  if (topic) filter.topic = topic;

  const answers = await StudentAnswer.find(filter).sort({ createdAt: -1 });
  res.json(answers);
});

export { submitAnswer, getMyAnswers };
