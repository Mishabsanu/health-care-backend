import express from 'express';
const router = express.Router();
import { 
    getDashboardStats,
    getFinancialStats,
    getAppointmentStats,
    getPatientStats,
    getInventoryStats,
    getAttendanceStats
} from '../controllers/statsController.js';
import { protect, hasPermission } from '../middleware/authMiddleware.js';

// -------------------------------------------------------------------
// PUBLIC | Analytics Hub (Protected Access)
// -------------------------------------------------------------------
// Legacy block (can be deprecated later)
router.get('/dashboard', protect, getDashboardStats);

// Component-based APIs for asynchronous non-blocking rendering
router.get('/financial', protect, getFinancialStats);
router.get('/appointments', protect, getAppointmentStats);
router.get('/patients', protect, getPatientStats);
router.get('/inventory', protect, getInventoryStats);
router.get('/attendance', protect, getAttendanceStats);

export default router;
