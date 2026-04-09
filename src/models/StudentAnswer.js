import mongoose from 'mongoose';

const studentAnswerSchema = mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    topic: {
      type: String,
      required: true,
    },
    questionId: {
      type: String,
      required: true,
    },
    questionText: {
      type: String,
    },
    selectedOption: {
      type: String,
      required: true,
    },
    correctAnswer: {
      type: String,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Optional compound index to allow quick lookups
studentAnswerSchema.index({ student: 1, topic: 1, questionId: 1 });

const StudentAnswer = mongoose.model('StudentAnswer', studentAnswerSchema);

export default StudentAnswer;
