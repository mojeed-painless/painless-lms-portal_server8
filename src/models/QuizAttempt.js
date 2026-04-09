import mongoose from 'mongoose';

const quizAttemptSchema = mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    topic: { type: String, required: true },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    timeTaken: { type: Number, required: true }, // seconds
    attemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

quizAttemptSchema.index({ student: 1, topic: 1, attemptedAt: -1 });

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

export default QuizAttempt;
