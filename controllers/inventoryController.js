import Inventory from '../models/Inventory.js';
import StockLog from '../models/StockLog.js';

// @desc    Retrieve Clinical Inventory
// @route   GET /api/inventory
export const getInventory = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 10 } = req.query;
    let query = {};

    if (category) query.category = category;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Inventory.countDocuments(query);
    const items = await Inventory.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      data: items,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('🚫 Inventory Registry Error:', err);
    res.status(500).json({ message: 'Internal Server Error | Failed to fetch inventory.' });
  }
};

// @desc    Retrieve Inventory for Dropdown Selectors
// @route   GET /api/inventory/dropdown
export const getInventoryDropdown = async (req, res) => {
  try {
    const items = await Inventory.find({ quantity: { $gt: 0 } })
      .select('name _id quantity salePrice pricePerUnit unit')
      .sort({ name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Retrieve Top Selling Products
// @route   GET /api/inventory/top-selling
export const getTopSellingProducts = async (req, res) => {
  try {
    const items = await Inventory.find({})
      .sort({ totalSold: -1 })
      .limit(5);
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error | Analytics failed.' });
  }
};

// @desc    Retrieve Single Inventory Item
// @route   GET /api/inventory/:id
// ... rest remains same ...
export const getInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) return res.status(404).json({ message: '🚫 Inventory Item Not Found.' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Add New Inventory Item
// @route   POST /api/inventory
export const createInventoryItem = async (req, res) => {
  try {

    const item = await Inventory.create({
      ...req.body,
      createdBy: req.user?.id
    });

    res.status(201).json(item);
  } catch (err) {
    console.error('❌ Inventory Registry Error:', err);
    res.status(400).json({
      message: err.name === 'ValidationError'
        ? `🚫 Validation Error | ${Object.values(err.errors)?.map(e => e.message).join(', ')}`
        : '🚫 Operational Error | Inventory registry failed.'
    });
  }
};

// @desc    Modify Inventory Item / Adjust Stock
// @route   PUT /api/inventory/:id
export const updateInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: '🚫 Inventory Item Not Found.' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: '🚫 Operational Error | Modification failed.' });
  }
};

// @desc    Remove Inventory Item
// @route   DELETE /api/inventory/:id
export const deleteInventoryItem = async (req, res) => {
  try {
    await Inventory.findByIdAndDelete(req.params.id);
    await StockLog.deleteMany({ productId: req.params.id }); // Clean logs
    res.json({ message: '🛡️ Inventory Record Cleared.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Restock Inventory Item
// @route   POST /api/inventory/:id/restock
export const restockInventoryItem = async (req, res) => {
  try {
    const { quantityAdded, supplierName, purchasePrice, salePrice } = req.body;
    const { id } = req.params;

    const item = await Inventory.findById(id);
    if (!item) return res.status(404).json({ message: '🚫 Item Not Found.' });

    // 1. Create Stock Log
    const log = await StockLog.create({
      productId: id,
      quantityAdded,
      supplierName,
      purchasePrice,
      salePrice,
      createdBy: req.user?.id
    });

    // 2. Update Inventory Master
    item.quantity += Number(quantityAdded);
    item.supplier = supplierName;
    item.purchasePrice = purchasePrice;
    item.salePrice = salePrice;
    item.lastRestocked = new Date();
    
    await item.save();

    res.status(201).json({ item, log });
  } catch (err) {
    console.error('🚫 Restock Error:', err);
    res.status(400).json({ message: '🚫 Operational Error | Restock failed.' });
  }
};

// @desc    Retrieve Stock Logs for an Item
// @route   GET /api/inventory/:id/logs
export const getInventoryLogs = async (req, res) => {
  try {
    const logs = await StockLog.find({ productId: req.params.id })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Retrieve Unique Suppliers for Suggestions
// @route   GET /api/inventory/suppliers/unique
export const getUniqueSuppliers = async (req, res) => {
  try {
    const suppliers = await StockLog.distinct('supplierName');
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
