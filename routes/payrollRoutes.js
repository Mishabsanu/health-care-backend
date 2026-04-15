import express from 'express';
import { getPayrollRegistry, getStaffAttendanceMonthly, getStaffPayrollParameters, getStaffPayrollProfile } from '../controllers/payrollController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

router.get('/registry', protect, getPayrollRegistry);
router.get('/staff/:id', protect, getStaffPayrollProfile);
router.get('/staff/:id/parameters', protect, getStaffPayrollParameters);
router.get('/staff/:id/attendance', protect, getStaffAttendanceMonthly);

export default router;
