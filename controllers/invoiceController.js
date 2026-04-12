import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Inventory from '../models/Inventory.js';

// @desc    Retrieve Clinical Invoices
// @route   GET /api/invoices
export const getInvoices = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, status } = req.query;
    // Base query
    let query = {};

    if (status) query.status = status;

    let aggregateQuery = [
      { $match: query },
      { $lookup: { from: 'patients', localField: 'patientId', foreignField: '_id', as: 'patient' } },
      { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'createdBy', foreignField: '_id', as: 'creator' } },
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } }
    ];

    if (search) {
      const searchConditions = [
        { 'patient.name': { $regex: search, $options: 'i' } },
        { 'id': { $regex: search, $options: 'i' } }
      ];

      // Ensure we properly match ObjectIds (e.g. from the Patient Details screen)
      if (mongoose.Types.ObjectId.isValid(search)) {
        searchConditions.push({ patientId: new mongoose.Types.ObjectId(search) });
      }

      aggregateQuery.push({
        $match: {
          $or: searchConditions
        }
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const countResult = await Invoice.aggregate([...aggregateQuery, { $count: 'total' }]);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    aggregateQuery.push({ $sort: { createdAt: -1 } });
    aggregateQuery.push({ $skip: skip });
    aggregateQuery.push({ $limit: parseInt(limit) });

    const invoices = await Invoice.aggregate(aggregateQuery);

    const formatted = invoices?.map(i => ({
      ...i,
      patientId: i.patient,
      createdBy: i.creator
    }));

    res.json({
      data: formatted,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('🚫 Registry Error | Backend Fetch:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Register New Clinical Invoice
// @route   POST /api/invoices
export const createInvoice = async (req, res) => {
  try {

    // 1. Generate Clinical Invoice ID
    const count = await Invoice.countDocuments();
    const year = new Date().getFullYear();
    const invoiceId = `INV-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const { items, discount = 0, tax = 0 } = req.body;

    // 2. Clinical Validation | Ensure Ledger Integrity
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: '🚫 Financial Error | At least one ledger item is required.' });
    }

    for (const item of items) {
      if (!item.name || item.name.trim() === '') {
        return res.status(400).json({ message: '🚫 Financial Error | All ledger items must have a valid description.' });
      }
      if (typeof item.price !== 'number' || isNaN(item.price)) {
        return res.status(400).json({ message: '🚫 Financial Error | Invalid unit price in ledger.' });
      }
    }

    // 3. Financial Calculations & Sanitization
    const subtotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const amount = (subtotal - discount) + tax;

    const sanitizedItems = items?.map(item => ({
      ...item,
      serviceId: item.serviceId === '' ? undefined : item.serviceId,
      inventoryId: item.inventoryId === '' ? undefined : item.inventoryId
    }));

    const invoiceData = {
      ...req.body,
      id: invoiceId,
      items: sanitizedItems,
      subtotal,
      amount,
      createdBy: req.user?.id
    };

    const invoice = await Invoice.create(invoiceData);

    // 4. Clinical Sync | Adjust Inventory Stock Levels
    const inventoryUpdates = items?.filter(item => item.inventoryId)
        ?.map(item =>
          Inventory.findByIdAndUpdate(item.inventoryId, {
            $inc: {
              quantity: -(item.quantity || 1),
              totalSold: (item.quantity || 1)
            }
          })
        );

    if (inventoryUpdates.length > 0) {
      await Promise.all(inventoryUpdates);
    }

    res.status(201).json(invoice);
  } catch (err) {
    console.error('🚫 Clinical Financial Failure | Registry trace:', err);
    res.status(400).json({
      message: '🚫 Financial Error | Registry failed.',
      details: err.message
    });
  }
};

// @desc    Modify Invoice Status
// @route   PUT /api/invoices/:id
export const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('patientId', 'name')
      .populate('createdBy', 'name');
    if (!invoice) return res.status(404).json({ message: '🚫 Invoice Not Found.' });
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ message: '🚫 Financial Error | Modification failed.' });
  }
};

// @desc    Clear Invoice Registry
// @route   DELETE /api/invoices/:id
export const deleteInvoice = async (req, res) => {
  try {
    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: '🛡️ Financial Record Cleared.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
