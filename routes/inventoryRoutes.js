import express from 'express';
import { getInventory, getInventoryDropdown, getInventoryItem, createInventoryItem, updateInventoryItem, deleteInventoryItem, getTopSellingProducts } from '../controllers/inventoryController.js';
import { protect, hasPermission } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/dropdown', getInventoryDropdown);
router.get('/top-selling', hasPermission('inventory:view'), getTopSellingProducts);

router.route('/')
  .get(hasPermission('inventory:view'), getInventory)
  .post(hasPermission('inventory:create'), createInventoryItem);

router.route('/:id')
  .get(hasPermission('inventory:view'), getInventoryItem)
  .put(hasPermission('inventory:edit'), updateInventoryItem)
  .delete(hasPermission('inventory:void'), deleteInventoryItem);

export default router;
