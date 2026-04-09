import express from 'express';
import {
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
} from '../controllers/assignmentController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ==================== STUDENT ROUTES ====================
// Get student's pending assignments
router.get('/student/pending', protect, getPendingAssignments);

// Get student's submitted assignments
router.get('/student/submitted', protect, getSubmittedAssignments);

// Get student's graded assignments
router.get('/student/graded', protect, getGradedAssignments);

// Submit an assignment
router.put('/:studentAssignmentId/submit', protect, submitAssignment);

// ==================== ADMIN ROUTES ====================
// Create a new assignment (POST must come before GET with :id)
router.post('/', protect, admin, createAssignment);

// Grade a submitted assignment
router.put('/:studentAssignmentId/grade', protect, admin, gradeAssignment);

// Update grade for a graded assignment
router.put('/:studentAssignmentId/update-grade', protect, admin, updateGrade);

// Get all created assignments (for management)
router.get('/admin/all', protect, admin, getCreatedAssignments);

// Get all submitted assignments (admin view)
router.get('/admin/submitted', protect, admin, getSubmittedAssignmentsAdmin);

// Get all graded assignments (admin view)
router.get('/admin/graded', protect, admin, getGradedAssignmentsAdmin);

// Update an assignment
router.put('/:assignmentId', protect, admin, updateAssignment);

// Delete an assignment
router.delete('/:assignmentId', protect, admin, deleteAssignment);

export default router;
