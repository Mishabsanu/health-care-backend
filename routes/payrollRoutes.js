import express from 'express';
import { getPayrollRegistry, getStaffAttendanceMonthly } from '../controllers/payrollController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

router.get('/registry', protect, getPayrollRegistry);
router.get('/staff/:id/attendance', protect, getStaffAttendanceMonthly);

export default router;
