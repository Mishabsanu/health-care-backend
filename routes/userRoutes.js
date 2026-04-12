import express from 'express';
const router = express.Router();
import { getUsers, getUsersDropdown, getUser, updateUser, deleteUser } from '../controllers/userController.js';
import { protect, hasPermission } from '../middleware/authMiddleware.js';

/**
 * 🧑‍💻 Staff Hub | Administrative Control
 * Branch Managers can manage staff within their branch.
 * Owners have cross-branch staff oversight.
 */
router.get('/', protect, hasPermission('users:view'), getUsers);
router.get('/dropdown', protect, getUsersDropdown);
router.get('/:id', protect, hasPermission('users:view'), getUser);
router.put('/:id', protect, hasPermission('users:edit'), updateUser);
router.delete('/:id', protect, hasPermission('users:delete'), deleteUser);

export default router;
