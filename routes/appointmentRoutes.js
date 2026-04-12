import express from 'express';
const router = express.Router();
import { getAppointments, getAppointment, createAppointment, updateAppointment, deleteAppointment, sendReminder } from '../controllers/appointmentController.js';
import { protect, hasPermission } from '../middleware/authMiddleware.js';

// -------------------------------------------------------------------
// PUBLIC | Appointment Hub (Protected Access)
// -------------------------------------------------------------------
router.get('/', protect, hasPermission('appointments:view'), getAppointments);

// @access  Authorized Admin Only
router.get('/:id', protect, hasPermission('appointments:view'), getAppointment);
router.post('/', protect, hasPermission('appointments:create'), createAppointment);
router.post('/:id/reminder', protect, hasPermission('appointments:remind'), sendReminder);
router.put('/:id', protect, hasPermission('appointments:edit'), updateAppointment);
router.delete('/:id', protect, hasPermission('appointments:cancel'), deleteAppointment);

export default router;
