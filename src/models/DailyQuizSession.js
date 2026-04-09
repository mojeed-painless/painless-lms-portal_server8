import mongoose from 'mongoose';

const dailyQuizSessionSchema = mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
  },
  { timestamps: true }
);

dailyQuizSessionSchema.index({ date: 1 }, { unique: true });

const DailyQuizSession = mongoose.model('DailyQuizSession', dailyQuizSessionSchema);

export default DailyQuizSession;
