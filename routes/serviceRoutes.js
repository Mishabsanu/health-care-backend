import express from 'express';
const router = express.Router();
import { getServices, getServicesDropdown, getServiceById, createService, updateService, deleteService } from '../controllers/serviceController.js';
import { protect, hasPermission } from '../middleware/authMiddleware.js';

// -------------------------------------------------------------------
// CLINICAL CATALOG | Multi-Branch Service Registry
// -------------------------------------------------------------------

router.get('/dropdown', protect, getServicesDropdown);

router.route('/')
  .get(protect, hasPermission('services:view'), getServices)
  .post(protect, hasPermission('services:create'), createService);

router.route('/:id')
  .get(protect, hasPermission('services:view'), getServiceById)
  .put(protect, hasPermission('services:edit'), updateService)
  .delete(protect, hasPermission('services:delete'), deleteService);

export default router;
