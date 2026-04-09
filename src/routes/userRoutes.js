import express from 'express';
import { 
    authUser, 
    registerUser, 
    getPendingUsers, 
    updateUserStatus,
    deleteUser,
    getAllUsers,
    getProgress,
    updateProgress,
    getAggregatedStudentGrades,
} from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();
const adminRouter = express.Router();

router.post('/login', authUser);
router.post('/register', registerUser);

router.use(protect);

// Aggregated grades available to any authenticated user (students + admins)
router.route('/grades')
    .get(getAggregatedStudentGrades);

router.route('/progress')
    .get(getProgress)
    .put(updateProgress);

adminRouter.route('/pending')
    .get(getPendingUsers); 

adminRouter.route('/all')
    .get(getAllUsers); 

adminRouter.route('/grades')
    .get(getAggregatedStudentGrades);

adminRouter.route('/:id')
    .put(updateUserStatus)
    .delete(deleteUser);

router.use('/admin', admin, adminRouter);

export default router;