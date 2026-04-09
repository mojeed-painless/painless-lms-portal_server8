// lms-backend/src/models/Progress.js

import mongoose from 'mongoose';

const progressSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// We need a unique index to ensure a user only tracks one completion status per lesson
progressSchema.index({ user: 1, lesson: 1 }, { unique: true });

const Progress = mongoose.model('Progress', progressSchema);

export default Progress;