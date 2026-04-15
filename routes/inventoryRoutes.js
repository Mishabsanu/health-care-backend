import express from 'express';
import { getInventory, getInventoryDropdown, getInventoryItem, createInventoryItem, updateInventoryItem, deleteInventoryItem, getTopSellingProducts, restockInventoryItem, getInventoryLogs, getUniqueSuppliers } from '../controllers/inventoryController.js';
import { protect, hasPermission } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/dropdown', getInventoryDropdown);
router.get('/top-selling', hasPermission('inventory:view'), getTopSellingProducts);

router.get('/suppliers/unique', hasPermission('inventory:view'), getUniqueSuppliers);

router.route('/')
  .get(hasPermission('inventory:view'), getInventory)
  .post(hasPermission('inventory:create'), createInventoryItem);

router.route('/:id')
  .get(hasPermission('inventory:view'), getInventoryItem)
  .put(hasPermission('inventory:edit'), updateInventoryItem)
  .delete(hasPermission('inventory:void'), deleteInventoryItem);

router.post('/:id/restock', hasPermission('inventory:edit'), restockInventoryItem);
router.get('/:id/logs', hasPermission('inventory:view'), getInventoryLogs);

export default router;
