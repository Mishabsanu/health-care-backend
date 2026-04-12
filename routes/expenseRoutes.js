import express from 'express';
import { getExpenses, getExpense, createExpense, updateExpense, deleteExpense } from '../controllers/expenseController.js';
import { protect, hasPermission } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(hasPermission('expenses:view'), getExpenses)
  .post(hasPermission('expenses:create'), createExpense);

router.route('/:id')
  .get(hasPermission('expenses:view'), getExpense)
  .put(hasPermission('expenses:edit'), updateExpense)
  .delete(hasPermission('expenses:void'), deleteExpense);

export default router;
