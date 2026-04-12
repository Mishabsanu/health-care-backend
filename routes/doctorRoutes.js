import express from 'express';
const router = express.Router();
import { getDoctors, getDoctor, getDoctorsDropdown, createDoctor, updateDoctor, deleteDoctor } from '../controllers/doctorController.js';
import { protect, hasPermission } from '../middleware/authMiddleware.js';

// -------------------------------------------------------------------
// PUBLIC | Specialist Hub (Protected Access)
// -------------------------------------------------------------------
router.get('/', protect, hasPermission('doctors:view'), getDoctors);
router.get('/dropdown', protect, getDoctorsDropdown); // Simplified access for selectors

// @access  Authorized Admin Only
router.get('/:id', protect, hasPermission('doctors:view'), getDoctor);
router.post('/', protect, hasPermission('doctors:create'), createDoctor);
router.put('/:id', protect, hasPermission('doctors:edit'), updateDoctor);
router.delete('/:id', protect, hasPermission('doctors:delete'), deleteDoctor);

export default router;
