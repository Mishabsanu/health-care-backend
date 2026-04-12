import jwt from 'jsonwebtoken';

/**
 * 🔐 protect | Clinical Access Guard
 * Verifies JWT and handles clinical session data.
 */
export const protect = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: '🚫 Vault Error | Unauthenticated access.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    // payload: { id, roleName, permissions, allAccess }
    req.user = decoded;
    next();
  } catch (err) {
    console.error('🚫 Auth Error | Invalid Token:', err);
    return res.status(401).json({ message: '🚫 Vault Error | Session expired or invalid.' });
  }
};

/**
 * 🛡️ hasPermission | Modular RBAC Guard
 * Checks if the user's role permits the requested clinical action.
 */
export const hasPermission = (permissionKey) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: '🚫 Security Error | Identity not verified.' });

    // 🚀 Super Admin Bypass
    if (req.user.allAccess) {
      return next();
    }

    if (req.user.permissions && req.user.permissions.includes(permissionKey)) {
      return next();
    }
    
    return res.status(403).json({ message: `🚫 Access Error | Missing clinical permission: ${permissionKey}` });
  };
};
