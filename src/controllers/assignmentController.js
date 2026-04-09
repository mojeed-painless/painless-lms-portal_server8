import asyncHandler from 'express-async-handler';
import Assignment from '../models/Assignment.js';
import StudentAssignment from '../models/StudentAssignment.js';
import User from '../models/User.js';

// @desc    Create a new assignment
// @route   POST /api/assignments
// @access  Private/Admin/Instructor
const createAssignment = asyncHandler(async (req, res) => {
  const { title, description, courseId, dueDate, maxScore } = req.body;

  if (!title || !courseId || !dueDate) {
    res.status(400);
    throw new Error('Please provide title, courseId, and dueDate');
  }

  const assignment = new Assignment({
    title: title.trim(),
    description: description?.trim() || '',
    courseId,
    createdBy: req.user._id,
    dueDate: new Date(dueDate),
    maxScore: maxScore || 100,
  });

  const createdAssignment = await assignment.save();

  // Get all students enrolled in this course
  // Note: You may need to adjust this based on your enrollment system
  const students = await User.find({ role: 'student' });

  // Create pending assignment records for all students
  const studentAssignments = students.map((student) => ({
    assignmentId: createdAssignment._id,
    studentId: student._id,
    status: 'pending',
  }));

  await StudentAssignment.insertMany(studentAssignments);

  res.status(201).json({
    message: 'Assignment created successfully',
    assignment: createdAssignment,
  });
});

// @desc    Get pending assignments for a student
// @route   GET /api/assignments/student/pending
// @access  Private/Student
const getPendingAssignments = asyncHandler(async (req, res) => {
  const studentId = req.user._id;

  const pendingAssignments = await StudentAssignment.find({
    studentId,
    status: 'pending',
  })
    .populate({
      path: 'assignmentId',
      select: 'title description dueDate courseId',
      populate: {
        path: 'courseId',
        select: 'title',
      },
    })
    .sort({ 'assignmentId.dueDate': 1 });

  // Transform the response to match frontend expectations
  const formatted = pendingAssignments.map((item) => ({
    id: item._id,
    assignmentId: item.assignmentId._id,
    title: item.assignmentId.title,
    description: item.assignmentId.description,
    courseName: item.assignmentId.courseId.title,
    dueDate: item.assignmentId.dueDate,
  }));

  res.json({
    count: formatted.length,
    assignments: formatted,
  });
});

// @desc    Get submitted assignments for a student
// @route   GET /api/assignments/student/submitted
// @access  Private/Student
const getSubmittedAssignments = asyncHandler(async (req, res) => {
  const studentId = req.user._id;

  const submittedAssignments = await StudentAssignment.find({
    studentId,
    status: 'submitted',
  })
    .populate({
      path: 'assignmentId',
      select: 'title description dueDate courseId',
      populate: {
        path: 'courseId',
        select: 'title',
      },
    })
    .sort({ submittedDate: -1 });

  const formatted = submittedAssignments.map((item) => ({
    id: item._id,
    assignmentId: item.assignmentId._id,
    title: item.assignmentId.title,
    description: item.assignmentId.description,
    courseName: item.assignmentId.courseId.title,
    dueDate: item.assignmentId.dueDate,
    submittedDate: item.submittedDate,
    submissionLink: item.submissionLink,
    status: 'Pending', // Awaiting grade
  }));

  res.json({
    count: formatted.length,
    assignments: formatted,
  });
});

// @desc    Get graded assignments for a student
// @route   GET /api/assignments/student/graded
// @access  Private/Student
const getGradedAssignments = asyncHandler(async (req, res) => {
  const studentId = req.user._id;

  const gradedAssignments = await StudentAssignment.find({
    studentId,
    status: 'graded',
  })
    .populate({
      path: 'assignmentId',
      select: 'title description dueDate courseId',
      populate: {
        path: 'courseId',
        select: 'title',
      },
    })
    .populate('gradedBy', 'firstName lastName')
    .sort({ gradedDate: -1 });

  const formatted = gradedAssignments.map((item) => ({
    id: item._id,
    assignmentId: item.assignmentId._id,
    title: item.assignmentId.title,
    description: item.assignmentId.description,
    courseName: item.assignmentId.courseId.title,
    dueDate: item.assignmentId.dueDate,
    submittedDate: item.submittedDate,
    submissionLink: item.submissionLink,
    score: `${item.score}%`,
    gradedDate: item.gradedDate,
    feedback: item.feedback,
  }));

  res.json({
    count: formatted.length,
    assignments: formatted,
  });
});

// @desc    Submit an assignment
// @route   PUT /api/assignments/:studentAssignmentId/submit
// @access  Private/Student
const submitAssignment = asyncHandler(async (req, res) => {
  const { submissionLink } = req.body;
  const { studentAssignmentId } = req.params;

  if (!submissionLink || !submissionLink.trim()) {
    res.status(400);
    throw new Error('Submission link is required');
  }

  const studentAssignment = await StudentAssignment.findById(studentAssignmentId);

  if (!studentAssignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  // Security check: ensure student can only submit their own assignments
  if (studentAssignment.studentId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to submit this assignment');
  }

  if (studentAssignment.status !== 'pending') {
    res.status(400);
    throw new Error('This assignment has already been submitted or graded');
  }

  studentAssignment.status = 'submitted';
  studentAssignment.submissionLink = submissionLink.trim();
  studentAssignment.submittedDate = new Date();

  const updatedAssignment = await studentAssignment.save();

  res.json({
    message: 'Assignment submitted successfully',
    assignment: updatedAssignment,
  });
});

// @desc    Get all submitted assignments (Admin view)
// @route   GET /api/assignments/admin/submitted
// @access  Private/Admin
const getSubmittedAssignmentsAdmin = asyncHandler(async (req, res) => {
  const submittedAssignments = await StudentAssignment.find({ status: 'submitted' })
    .populate({
      path: 'assignmentId',
      select: 'title description dueDate courseId maxScore',
      populate: {
        path: 'courseId',
        select: 'title',
      },
    })
    .populate('studentId', 'firstName lastName email username')
    .sort({ submittedDate: 1 });

  const formatted = submittedAssignments.map((item) => ({
    id: item._id,
    assignmentId: item.assignmentId._id,
    title: item.assignmentId.title,
    description: item.assignmentId.description,
    courseName: item.assignmentId.courseId.title,
    dueDate: item.assignmentId.dueDate,
    submittedDate: item.submittedDate,
    submissionLink: item.submissionLink,
    studentName: `${item.studentId.firstName} ${item.studentId.lastName}`,
    studentEmail: item.studentId.email,
    studentId: item.studentId._id,
    maxScore: item.assignmentId.maxScore,
  }));

  res.json({
    count: formatted.length,
    assignments: formatted,
  });
});

// @desc    Get all graded assignments (Admin view)
// @route   GET /api/assignments/admin/graded
// @access  Private/Admin
const getGradedAssignmentsAdmin = asyncHandler(async (req, res) => {
  const gradedAssignments = await StudentAssignment.find({ status: 'graded' })
    .populate({
      path: 'assignmentId',
      select: 'title description dueDate courseId maxScore',
      populate: {
        path: 'courseId',
        select: 'title',
      },
    })
    .populate('studentId', 'firstName lastName email username')
    .populate('gradedBy', 'firstName lastName')
    .sort({ gradedDate: -1 });

  const formatted = gradedAssignments.map((item) => ({
    id: item._id,
    assignmentId: item.assignmentId._id,
    title: item.assignmentId.title,
    description: item.assignmentId.description,
    courseName: item.assignmentId.courseId.title,
    dueDate: item.assignmentId.dueDate,
    submittedDate: item.submittedDate,
    submissionLink: item.submissionLink,
    score: `${item.score}%`,
    studentName: `${item.studentId.firstName} ${item.studentId.lastName}`,
    studentEmail: item.studentId.email,
    studentId: item.studentId._id,
    gradedBy: item.gradedBy ? `${item.gradedBy.firstName} ${item.gradedBy.lastName}` : 'N/A',
    gradedDate: item.gradedDate,
    feedback: item.feedback,
    maxScore: item.assignmentId.maxScore,
  }));

  res.json({
    count: formatted.length,
    assignments: formatted,
  });
});

// @desc    Grade/Save score for a submitted assignment
// @route   PUT /api/assignments/:studentAssignmentId/grade
// @access  Private/Admin
const gradeAssignment = asyncHandler(async (req, res) => {
  const { score, feedback } = req.body;
  const { studentAssignmentId } = req.params;

  if (score === undefined || score === null || score === '') {
    res.status(400);
    throw new Error('Score is required');
  }

  if (isNaN(score) || score < 0 || score > 100) {
    res.status(400);
    throw new Error('Score must be a number between 0 and 100');
  }

  const studentAssignment = await StudentAssignment.findById(studentAssignmentId);

  if (!studentAssignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  if (studentAssignment.status === 'pending') {
    res.status(400);
    throw new Error('Assignment has not been submitted yet');
  }

  studentAssignment.status = 'graded';
  studentAssignment.score = parseInt(score);
  studentAssignment.feedback = feedback?.trim() || null;
  studentAssignment.gradedDate = new Date();
  studentAssignment.gradedBy = req.user._id;

  const updatedAssignment = await studentAssignment.save();

  res.json({
    message: 'Assignment graded successfully',
    assignment: updatedAssignment,
  });
});

// @desc    Edit/Update grade for a graded assignment
// @route   PUT /api/assignments/:studentAssignmentId/update-grade
// @access  Private/Admin
const updateGrade = asyncHandler(async (req, res) => {
  const { score, feedback } = req.body;
  const { studentAssignmentId } = req.params;

  if (score === undefined || score === null || score === '') {
    res.status(400);
    throw new Error('Score is required');
  }

  if (isNaN(score) || score < 0 || score > 100) {
    res.status(400);
    throw new Error('Score must be a number between 0 and 100');
  }

  const studentAssignment = await StudentAssignment.findById(studentAssignmentId);

  if (!studentAssignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  if (studentAssignment.status !== 'graded') {
    res.status(400);
    throw new Error('Only graded assignments can be updated');
  }

  studentAssignment.score = parseInt(score);
  studentAssignment.feedback = feedback?.trim() || null;
  studentAssignment.updatedAt = new Date();

  const updatedAssignment = await studentAssignment.save();

  res.json({
    message: 'Grade updated successfully',
    assignment: updatedAssignment,
  });
});

// @desc    Get all created assignments (Admin management)
// @route   GET /api/assignments/admin/all
// @access  Private/Admin
const getCreatedAssignments = asyncHandler(async (req, res) => {
  const createdAssignments = await Assignment.find()
    .populate('createdBy', 'firstName lastName')
    .populate('courseId', 'title')
    .sort({ createdAt: -1 });

  const formatted = createdAssignments.map((assignment) => ({
    id: assignment._id,
    title: assignment.title,
    description: assignment.description,
    courseName: assignment.courseId.title,
    courseId: assignment.courseId._id,
    dueDate: assignment.dueDate,
    maxScore: assignment.maxScore,
    createdBy: `${assignment.createdBy.firstName} ${assignment.createdBy.lastName}`,
    isActive: assignment.isActive,
    createdAt: assignment.createdAt,
  }));

  res.json({
    count: formatted.length,
    assignments: formatted,
  });
});

// @desc    Update an assignment
// @route   PUT /api/assignments/:assignmentId
// @access  Private/Admin
const updateAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { title, description, dueDate, maxScore } = req.body;

  const assignment = await Assignment.findById(assignmentId);

  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  // Security check: only admin or creator can update
  if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this assignment');
  }

  // Update fields if provided
  if (title) assignment.title = title.trim();
  if (description !== undefined) assignment.description = description.trim() || '';
  if (dueDate) assignment.dueDate = new Date(dueDate);
  if (maxScore !== undefined) assignment.maxScore = maxScore;

  const updatedAssignment = await assignment.save();

  res.json({
    message: 'Assignment updated successfully',
    assignment: updatedAssignment,
  });
});

// @desc    Delete an assignment
// @route   DELETE /api/assignments/:assignmentId
// @access  Private/Admin
const deleteAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  const assignment = await Assignment.findById(assignmentId);

  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  // Security check: only admin or creator can delete
  if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this assignment');
  }

  // Delete all student assignment records
  await StudentAssignment.deleteMany({ assignmentId });

  // Delete the assignment
  await Assignment.findByIdAndDelete(assignmentId);

  res.json({
    message: 'Assignment deleted successfully',
  });
});

export {
  createAssignment,
  getPendingAssignments,
  getSubmittedAssignments,
  getGradedAssignments,
  submitAssignment,
  getSubmittedAssignmentsAdmin,
  getGradedAssignmentsAdmin,
  gradeAssignment,
  updateGrade,
  getCreatedAssignments,
  updateAssignment,
  deleteAssignment,
};
