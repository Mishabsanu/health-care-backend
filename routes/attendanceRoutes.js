import express from 'express';
import { recordCheckIn, recordCheckOut, getAttendance, getAttendanceStats, getOperationalStatus, createManualRecord, getAttendanceStaff } from '../controllers/attendanceController.js';
import { protect, hasPermission } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// 🏥 Operational Registry Operations
router.get('/', hasPermission('operations:view'), getAttendance);
router.get('/status', hasPermission('operations:view'), getOperationalStatus);
router.get('/staff', hasPermission('operations:view'), getAttendanceStaff);
router.get('/stats', hasPermission('operations:view'), getAttendanceStats);
router.post('/check-in', recordCheckIn);
router.put('/check-out/:id', recordCheckOut);
router.post('/manual', hasPermission('operations:create'), createManualRecord);

export default router;
