import Role from '../models/Role.js';
import PERMISSIONS from '../config/permissions.js';

// @desc    Retrieve Management Roles
// @route   GET /api/roles
export const getRoles = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Role.countDocuments(query);
    const roles = await Role.find(query)
      .populate('createdBy', 'name')
      .sort({ isSystemRole: -1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      data: roles,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
  }
};

// @desc    Retrieve Management Roles for Dropdown Selectors
// @route   GET /api/roles/dropdown
export const getRolesDropdown = async (req, res) => {
    try {
        const roles = await Role.find({}).select('name _id').sort({ name: 1 });
        res.json(roles);
    } catch (err) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// @desc    Retrieve Single Role Details
// @route   GET /api/roles/:id
export const getRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role Not Found.' });
    res.json(role);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Retrieve Available Clinical Permissions
// @route   GET /api/roles/permissions
export const getAvailablePermissions = (req, res) => {
  res.json(PERMISSIONS);
};

// @desc    Register New Role
// @route   POST /api/roles
export const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const roleExists = await Role.findOne({ name });
    if (roleExists) return res.status(400).json({ message: 'Role Error | Name exists.' });

    const role = await Role.create({
      name,
      description,
      permissions,
      allAccess: req.body.allAccess || false,
      createdBy: req.user?.id
    });
    res.status(201).json(role);
  } catch (err) {
    res.status(400).json({ message: 'Role Error | Invalid data.' });
  }
};

// @desc    Update Clinical Role permissions
// @route   PUT /api/roles/:id
export const updateRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role Not Found.' });
    if (role.isSystemRole && req.user.roleName !== 'Owner') {
      return res.status(403).json({ message: 'System Error | Protected role.' });
    }

    const updatedRole = await Role.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedRole);
  } catch (err) {
    res.status(400).json({ message: 'Role Error | Update failed.' });
  }
};

// @desc    Delete Administrative Role
// @route   DELETE /api/roles/:id
export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role || role.isSystemRole) {
      return res.status(403).json({ message: 'Access Error | Protected or Not Found.' });
    }
    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: '🛡️ Role Registry Cleared.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
