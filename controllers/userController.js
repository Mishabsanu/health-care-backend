import User from '../models/User.js';

// @desc    Retrieve Management Users
// @route   GET /api/users
export const getUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, status } = req.query;
    const query = {};

    if (status) query.status = status;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
        .populate('role')
        .populate('createdBy', 'name')
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit));

    res.json({
        data: users,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('🚫 Registry Error | Backend Fetch:', err);
  }
};

// @desc    Retrieve Users for Dropdown Selectors
// @route   GET /api/users/dropdown
export const getUsersDropdown = async (req, res) => {
    try {
        const users = await User.find({ status: { $ne: 'Inactive' } })
            .select('name _id email')
            .sort({ name: 1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// @desc    Retrieve Single Clinical User Profile
// @route   GET /api/users/:id
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('role');
      
    if (!user) {
        return res.status(404).json({ message: '🚫 User Registry | Not Found.' });
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Update Clinical User Profile
// @route   PUT /api/users/:id
export const updateUser = async (req, res) => {
  try {
    const { 
        name, email, role, status,
        panCard, adharCard, accountNumber, ifscCode, bankName, joinDate,
        salaryDetails, salaryConfig
    } = req.body;

    // Recalculate Net Salary
    let netSalary = 0;
    if (salaryDetails) {
        netSalary = (salaryDetails.basicSalary || 0) + (salaryDetails.allowance || 0) - (salaryDetails.deduction || 0);
    }
    
    const updateData = { 
        name, email, role, status,
        panCard, adharCard, accountNumber, ifscCode, bankName, joinDate,
        salaryDetails: salaryDetails ? { ...salaryDetails, netSalary } : undefined,
        salaryConfig
    };
    
    const user = await User.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    ).populate('role');
    
    if (!user) return res.status(404).json({ message: '🚫 User Registry | Not Found.' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: '🚫 User Error | Modification failed.' });
  }
};

// @desc    Delete Administrative User
// @route   DELETE /api/users/:id
export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: '🛡️ Clinical Staff Registry Cleared.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
