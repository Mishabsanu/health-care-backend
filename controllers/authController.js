import User from '../models/User.js';
import '../models/Role.js'; // Ensure Role model is registered
import jwt from 'jsonwebtoken';

// -------------------------------------------------------------------
// SECURITY UTILITIES | JWT Token Selection with Dynamic Permissions
// -------------------------------------------------------------------
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      roleName: user.role.name,
      permissions: user.role.permissions,
      allAccess: user.role.allAccess || false
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '24h' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
  );
};

// @desc    Clinical Session Login
// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // 🔍 Dynamic Lookup | Search by Email OR Employee ID
    const user = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { employeeId: email }]
    }).populate('role');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Vault Error | Invalid credentials.' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ message: 'Account Error | Credentials suspended.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Secure Refresh Token in HTTP-only Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roleName: user.role.name,
        permissions: user.role.permissions,
        allAccess: user.role.allAccess || false
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Clinical Session Refresh (JWT Rotation)
// @route   POST /api/auth/refresh
export const refresh = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(403).json({ message: 'Session Error | Refresh required.' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).populate('role');

    if (!user || user.status !== 'Active') {
      return res.status(403).json({ message: 'Account Error | Suspended or not found.' });
    }

    const newAccessToken = generateAccessToken(user);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(403).json({ message: 'Session Error | Expired or invalid token.' });
  }
};

// @desc    Clinical Profile Verification
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('role');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roleName: user.role.name,
        permissions: user.role.permissions,
        allAccess: user.role.allAccess || false
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Clinical Session Clearance
// @route   POST /api/auth/logout
export const logout = (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: '🛡️ Clinical Vault Secured: Session Cleared.' });
};

// @desc    Clinical User Onboarding
// @route   POST /api/auth/register
export const register = async (req, res) => {
  try {
    const {
      name, email, password, roleId,
      panCard, adharCard, accountNumber, ifscCode, bankName, joinDate,
      salaryDetails
    } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'Registration Error | User exists.' });

    // Calculate Net Salary if details provided
    const netSalary = (salaryDetails?.basicSalary || 0) + (salaryDetails?.allowance || 0) - (salaryDetails?.deduction || 0);

    // 🆔 Automated Identity Generation | format: AKOD-0001
    const company = 'AKOD';
    const totalUsers = await User.countDocuments();
    const sequence = (totalUsers + 1).toString().padStart(4, '0');
    const employeeId = `${company}-${sequence}`;

    const user = await User.create({
      name, email, password, role: roleId,
      panCard, adharCard, accountNumber, ifscCode, bankName, joinDate,
      employeeId,
      createdBy: req.user?.id,
      salaryDetails: {
        ...salaryDetails,
        netSalary
      }
    });

    res.status(201).json({ message: '🛡️ New Clinical User Onboarded.', userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Registration Error | Data invalid.' });
  }
};
