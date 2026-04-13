import express from 'express';
const router = express.Router();
import { getInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice } from '../controllers/invoiceController.js';
import { protect, hasPermission } from '../middleware/authMiddleware.js';

// -------------------------------------------------------------------
// PUBLIC | Financial Hub (Protected Access)
// -------------------------------------------------------------------
router.get('/', protect, hasPermission('billing:view'), getInvoices);
router.get('/:id', protect, hasPermission('billing:view'), getInvoiceById);

// @access  Authorized Admin Only
router.post('/', protect, hasPermission('billing:create'), createInvoice);
router.put('/:id', protect, hasPermission('billing:edit'), updateInvoice);
router.delete('/:id', protect, hasPermission('billing:void'), deleteInvoice);

export default router;
