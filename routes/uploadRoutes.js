import express from 'express';
import { getCloudinarySignature } from '../controllers/uploadController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only authenticated staff can generate upload signatures
router.get('/sign', protect, getCloudinarySignature);

export default router;
