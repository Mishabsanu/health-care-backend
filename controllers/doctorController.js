import mongoose from 'mongoose';
import Doctor from '../models/Doctor.js';

// @desc    Retrieve Medical Specialists
// @route   GET /api/doctors
export const getDoctors = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, status } = req.query;
    let query = {};

    if (status) {
        query.status = status;
    }

    // Specialized Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Doctor.countDocuments(query);
    const doctors = await Doctor.find(query)
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    res.json({
        data: doctors,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('🚫 Registry Error | Backend Fetch:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Retrieve Single Specialist Profile
// @route   GET /api/doctors/:id
export const getDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id).populate('createdBy', 'name');
        if (!doctor) return res.status(404).json({ message: '🚫 Specialist Registry | Not Found.' });
        res.json(doctor);
    } catch (err) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// @desc    Retrieve Specialists for Dropdown Selectors
// @route   GET /api/doctors/dropdown
export const getDoctorsDropdown = async (req, res) => {
  try {
        let query = {};

        const doctors = await Doctor.find(query).select('name _id specialization').sort({ name: 1 });
        res.json(doctors);
    } catch (err) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// @desc    Register New Specialist
// @route   POST /api/doctors
export const createDoctor = async (req, res) => {
  try {
    const data = { ...req.body };
    
    if (data.email === '') delete data.email;

    const doctor = await Doctor.create({
      ...data,
      createdBy: req.user.id
    });
    res.status(201).json(doctor);
  } catch (err) {
    console.error('🚫 Registry Error | Specialist creation failed:', err);
    res.status(400).json({ 
      message: '🚫 Specialist Error | Registration failed.',
      error: err.message
    });
  }
};

// @desc    Modify Specialist Profile
// @route   PUT /api/doctors/:id
export const updateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doctor) return res.status(404).json({ message: '🚫 Specialist Registry | Not Found.' });
    res.json(doctor);
  } catch (err) {
    res.status(400).json({ message: '🚫 Specialist Error | Modification failed.' });
  }
};

// @desc    Clear Specialist Registry
// @route   DELETE /api/doctors/:id
export const deleteDoctor = async (req, res) => {
  try {
    await Doctor.findByIdAndDelete(req.params.id);
    res.json({ message: '🛡️ Specialist Registry Cleared.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
