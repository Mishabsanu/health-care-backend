import mongoose from 'mongoose';
import Service from '../models/Service.js';

// @desc    Get all clinical services
// @route   GET /api/services
export const getServices = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 10, status } = req.query;
    const query = { status: status || { $ne: 'Archived' } };
    
    if (category) query.category = category;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Service.countDocuments(query);
    const services = await Service.find(query)
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    res.json({
        data: services,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('🚫 Registry Error | Backend Fetch:', err);
  }
};

// @desc    Retrieve Services for Dropdown Selectors
// @route   GET /api/services/dropdown
export const getServicesDropdown = async (req, res) => {
    try {
        const services = await Service.find({ status: { $ne: 'Archived' } })
            .select('name _id price category')
            .sort({ name: 1 });
        res.json(services);
    } catch (err) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// @desc    Retrieve Single Service Modality
// @route   GET /api/services/:id
export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate('createdBy', 'name');
    if (!service) return res.status(404).json({ message: '🚫 Service Registry | Entry Not Found.' });
    res.json(service);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Create new service
// @route   POST /api/services
export const createService = async (req, res) => {
  try {
    const { name, category, price, description } = req.body;
    
    const service = await Service.create({
      ...req.body,
      createdBy: req.user.id
    });
    res.status(201).json(service);
  } catch (err) {
    console.error('🚫 Service Creation Error:', err);
    res.status(400).json({ message: '🚫 Service Registry | Failed to create entry. Check clinical data.' });
  }
};

// @desc    Update clinical service
// @route   PUT /api/services/:id
export const updateService = async (req, res) => {
  try {
    const { name, category, price, status, description } = req.body;
    
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { name, category, price, status, description },
      { new: true }
    );
    
    if (!service) return res.status(404).json({ message: 'Service not found.' });
    res.json(service);
  } catch (err) {
    res.status(400).json({ message: '🚫 Service Registry | Failed to update modality.' });
  }
};

// @desc    Archive clinical service
// @route   DELETE /api/services/:id
export const deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, { status: 'Archived' });
    if (!service) return res.status(404).json({ message: 'Service not found.' });
    res.json({ message: 'Service archived successfully.' });
  } catch (err) {
    res.status(500).json({ message: '🚫 Service Registry | Failed to archive entry.' });
  }
};
