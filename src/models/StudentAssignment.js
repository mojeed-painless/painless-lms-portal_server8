import mongoose from 'mongoose';

const studentAssignmentSchema = mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'graded'],
      default: 'pending',
    },
    submissionLink: {
      type: String,
      default: null,
    },
    submittedDate: {
      type: Date,
      default: null,
    },
    score: {
      type: Number,
      default: null,
    },
    gradedDate: {
      type: Date,
      default: null,
    },
    gradedBy: {
      // The instructor/admin who graded this
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    feedback: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique combination of assignmentId and studentId
studentAssignmentSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

const StudentAssignment = mongoose.model('StudentAssignment', studentAssignmentSchema);

export default StudentAssignment;
