import express from 'express';
const router = express.Router();
import { login, refresh, logout, register } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

// -------------------------------------------------------------------
// PUBLIC | Authentication Hub
// -------------------------------------------------------------------
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// @route   POST /api/auth/register
// @access  Owner/Admin Only
router.post('/register', protect, register); 

// -------------------------------------------------------------------
// PROTECTED | Clinical Profile & Security Verification
// -------------------------------------------------------------------
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

export default router;
