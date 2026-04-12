import express from 'express';
const router = express.Router();
import { getRoles, getRolesDropdown, getRole, getAvailablePermissions, createRole, updateRole, deleteRole } from '../controllers/roleController.js';
import { protect, hasPermission } from '../middleware/authMiddleware.js';

/**
 * 🛡️ Role Registry | Authorization Infrastructure
 * Only Owners can modify the authorization matrix.
 */
router.get('/dropdown', protect, getRolesDropdown);
router.get('/', protect, hasPermission('roles:view'), getRoles);
router.get('/permissions', protect, hasPermission('roles:view'), getAvailablePermissions);
router.get('/:id', protect, hasPermission('roles:view'), getRole);

router.post('/', protect, hasPermission('roles:create'), createRole);
router.put('/:id', protect, hasPermission('roles:edit'), updateRole);
router.delete('/:id', protect, hasPermission('roles:delete'), deleteRole);

export default router;
