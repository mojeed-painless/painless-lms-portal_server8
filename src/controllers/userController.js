import asyncHandler from 'express-async-handler';
import generateToken from '../utils/generateToken.js';
import User from '../models/User.js';
import StudentAssignment from '../models/StudentAssignment.js';
import Assignment from '../models/Assignment.js';
import QuizAttempt from '../models/QuizAttempt.js';

// @desc    Auth user & get token (Login)
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  const user = await User.findOne({ 
    $or: [{ email: identifier }, { username: identifier }] 
  });

  if (user && (await user.matchPassword(password))) {
    
    if (!user.isApproved) {
        res.status(401);
        throw new Error('Account pending approval. Please wait for an administrator to activate your account.');
    }
    
    // If approved, send success response
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      role: user.role,
      htmlAccess: user.htmlAccess ?? false,
      jsAccess: user.jsAccess ?? false,
      reactAccess: user.reactAccess ?? false,
      completedLessons: user.completedLessons || [],
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
      throw new Error('Invalid username/email or password'); 
  }
});







// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, username, email, password, role } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const initialApprovalStatus = (role === 'admin');

  const user = await User.create({
    firstName,
    lastName,
    username,
    email,
    password,
    role: role || 'student', 
    isApproved: initialApprovalStatus ? true : false,
    htmlAccess: false,
    jsAccess: false,
    reactAccess: false,
  });

  if (user) {
    res.status(201).json({
      message: 'Registration successful. Account pending admin approval.',
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      htmlAccess: user.htmlAccess,
      jsAccess: user.jsAccess,
      reactAccess: user.reactAccess,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});














// @desc    Get all users pending approval
// @route   GET /api/users/admin/pending
// @access  Private/Admin
const getPendingUsers = asyncHandler(async (req, res) => {

  const users = await User.find({ isApproved: false }).select('-password').lean();
  const usersWithDefaults = users.map(user => ({
    ...user,
    htmlAccess: user.htmlAccess ?? false,
    jsAccess: user.jsAccess ?? false,
    reactAccess: user.reactAccess ?? false,
  }));
  res.json(usersWithDefaults);
});







// @desc    Approve/Reject a user and optionally change role
// @route   PUT /api/users/admin/:id
// @access  Private/Admin
const updateUserStatus = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { isApproved, role, htmlAccess, jsAccess, reactAccess } = req.body;
  
  const updateFields = {};

  if (isApproved !== undefined) {
    updateFields.isApproved = isApproved;
  }
  
  const validRoles = ['student', 'instructor', 'admin'];
  if (role && validRoles.includes(role)) {
    updateFields.role = role;
  }

  // Handle course access fields
  if (htmlAccess !== undefined) {
    updateFields.htmlAccess = htmlAccess;
  }
  if (jsAccess !== undefined) {
    updateFields.jsAccess = jsAccess;
  }
  if (reactAccess !== undefined) {
    updateFields.reactAccess = reactAccess;
  }
  
  if (Object.keys(updateFields).length === 0) {
      res.status(400);
      throw new Error(`No valid fields provided for update. Received body: ${JSON.stringify(req.body)}`);
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    { 
      new: true,
      runValidators: false,
    }
  ).select('-password');

  if (updatedUser) {
    res.json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      username: updatedUser.username,
      isApproved: updatedUser.isApproved,
      role: updatedUser.role,
      htmlAccess: updatedUser.htmlAccess,
      jsAccess: updatedUser.jsAccess,
      reactAccess: updatedUser.reactAccess,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});








// @desc    Delete a user permanently
// @route   DELETE /api/users/admin/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    if (user.role === 'admin' && req.user._id.toString() !== user._id.toString()) {
        res.status(403);
        throw new Error('Cannot delete another administrator.');
    }

    await User.deleteOne({ _id: user._id });

    res.json({ message: 'User removed successfully' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});









// @desc    Get all registered users (approved and unapproved)
// @route   GET /api/users/admin/all
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
 
  const users = await User.find({ _id: { $ne: req.user._id } }).select('-password').lean();
  const usersWithDefaults = users.map(user => ({
    ...user,
    htmlAccess: user.htmlAccess ?? false,
    jsAccess: user.jsAccess ?? false,
    reactAccess: user.reactAccess ?? false,
  }));
  res.json(usersWithDefaults);
});

// @desc    Get user's progress (completed lessons)
// @route   GET /api/users/progress
// @access  Private
const getProgress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('completedLessons');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({
    completedLessons: user.completedLessons || [],
  });
});

// @desc    Update user's progress (mark lesson as complete)
// @route   PUT /api/users/progress
// @access  Private
const updateProgress = asyncHandler(async (req, res) => {
  const { completedLessons } = req.body;

  if (!Array.isArray(completedLessons)) {
    res.status(400);
    throw new Error('completedLessons must be an array');
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { completedLessons: completedLessons },
    { new: true }
  ).select('completedLessons');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({
    message: 'Progress updated successfully',
    completedLessons: user.completedLessons,
  });
});

export { 
    authUser, 
    registerUser, 
    getPendingUsers, 
    updateUserStatus,
    deleteUser,
    getAllUsers,
    getProgress,
    updateProgress
};

// @desc    Get aggregated student grades (assignment avg, quiz avg, overall)
// @route   GET /api/users/admin/grades
// @access  Private/Admin
const getAggregatedStudentGrades = asyncHandler(async (req, res) => {
  // Aggregate assignment percentages per student
  const assignmentAgg = await StudentAssignment.aggregate([
    { $match: { status: 'graded', score: { $ne: null } } },
    {
      $lookup: {
        from: 'assignments',
        localField: 'assignmentId',
        foreignField: '_id',
        as: 'assignment',
      },
    },
    { $unwind: '$assignment' },
    {
      $project: {
        studentId: 1,
        percent: { $multiply: [{ $divide: ['$score', '$assignment.maxScore'] }, 100] },
      },
    },
    { $group: { _id: '$studentId', assignmentAverage: { $avg: '$percent' }, assignmentCount: { $sum: 1 } } },
  ]);

  // Aggregate latest quiz attempt per topic, then average per student
  const quizAgg = await QuizAttempt.aggregate([
    { $sort: { student: 1, topic: 1, attemptedAt: -1 } },
    { $group: { _id: { student: '$student', topic: '$topic' }, score: { $first: '$score' }, total: { $first: '$total' } } },
    { $project: { student: '$_id.student', percent: { $multiply: [{ $divide: ['$score', '$total'] }, 100] } } },
    { $group: { _id: '$student', quizAverage: { $avg: '$percent' }, quizCount: { $sum: 1 } } },
  ]);

  // Normalize into maps for fast lookup
  const assignmentMap = {};
  assignmentAgg.forEach(a => {
    assignmentMap[a._id.toString()] = { avg: a.assignmentAverage, count: a.assignmentCount };
  });

  const quizMap = {};
  quizAgg.forEach(q => {
    quizMap[q._id.toString()] = { avg: q.quizAverage, count: q.quizCount };
  });

  // Fetch only approved students
  const students = await User.find({ role: 'student', isApproved: true }).select('-password').lean();

  const results = students.map(u => {
    const id = u._id.toString();
    const a = assignmentMap[id] || { avg: 0, count: 0 };
    const q = quizMap[id] || { avg: 0, count: 0 };

    const assignmentAverage = a.count ? Number(a.avg.toFixed(2)) : 0;
    const quizAverage = q.count ? Number(q.avg.toFixed(2)) : 0;
    let overall = 0;
    if (a.count > 0 && q.count > 0) overall = Number(((assignmentAverage + quizAverage) / 2).toFixed(2));
    else if (a.count > 0) overall = assignmentAverage;
    else if (q.count > 0) overall = quizAverage;

    return {
      _id: u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      email: u.email,
      assignmentAverage,
      assignmentCount: a.count,
      quizAverage,
      quizCount: q.count,
      overall,
    };
  });

  // Sort descending by overall
  results.sort((x, y) => y.overall - x.overall);

  res.json(results);
});

export { getAggregatedStudentGrades };