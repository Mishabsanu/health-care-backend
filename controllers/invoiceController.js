import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Inventory from '../models/Inventory.js';
import Appointment from '../models/Appointment.js';

// @desc    Retrieve Clinical Invoices
// @route   GET /api/invoices
export const getInvoices = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, status, date } = req.query;
    // Base query
    let query = {};

    if (status) query.status = status;
    if (date) query.date = date;

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
// @desc    Retrieve Single Clinical Invoice
// @route   GET /api/invoices/:id
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('patientId', 'name phone patientId')
      .populate('createdBy', 'name');
    
    if (!invoice) {
        return res.status(404).json({ message: '🚫 Invoice Not Found.' });
    }
    
    res.json(invoice);
  } catch (err) {
    console.error('🚫 Ledger Error | Detail Fetch Failure:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Register New Clinical Invoice
// @route   POST /api/invoices
export const createInvoice = async (req, res) => {
  try {
    const { items, discount = 0, tax = 0, appointmentId } = req.body;

    // Billing is allowed only after a completed, unbilled appointment session.
    if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ message: 'Financial Error | Please complete an appointment session before generating a bill.' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Financial Error | Appointment session not found.' });
    }

    if (String(appointment.patientId) !== String(req.body.patientId)) {
      return res.status(400).json({ message: 'Financial Error | Selected patient does not match the appointment session.' });
    }

    if (appointment.status !== 'Completed') {
      return res.status(400).json({ message: 'Financial Error | Bill can be generated only after appointment session is completed.' });
    }

    if (appointment.isBilled) {
      return res.status(400).json({ message: 'Financial Error | This appointment already has a registered bill.' });
    }

    const existingBill = await Invoice.findOne({ appointmentId });
    if (existingBill) {
      return res.status(400).json({ message: 'Financial Error | This appointment already has a registered bill.' });
    }

    // 1. Generate Clinical Bill ID (Simplified Registry Number)
    const count = await Invoice.countDocuments();
    const billNo = `INV-${1000 + count + 1}`;

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
    const paidAmount = Number(req.body.paidAmount) || 0;
    const balanceAmount = amount - paidAmount;
    
    // Auto-update status based on clinical threshold
    let status = req.body.status || 'Unpaid';
    if (paidAmount > amount) {
      status = 'Advance';
    } else if (paidAmount === amount && amount > 0) {
      status = 'Paid';
    } else if (paidAmount > 0) {
      status = 'Partially Paid';
    }

    const sanitizedItems = items?.map(item => ({
      ...item,
      serviceId: item.serviceId === '' ? undefined : item.serviceId,
      inventoryId: item.inventoryId === '' ? undefined : item.inventoryId
    }));

    const invoiceData = {
      ...req.body,
      id: billNo,
      patientId: req.body.patientId === '' ? undefined : req.body.patientId,
      appointmentId: req.body.appointmentId === '' ? undefined : req.body.appointmentId,
      items: sanitizedItems,
      subtotal,
      amount,
      paidAmount,
      balanceAmount,
      payments: paidAmount > 0 ? [{
        date: req.body.date || new Date().toISOString().split('T')[0],
        amount: paidAmount,
        method: req.body.method || 'Cash',
        note: req.body.paymentNote || 'Initial payment'
      }] : [],
      status,
      createdBy: req.user?.id
    };

    const invoice = await Invoice.create(invoiceData);

    // 🎯 Step 5: Clinical Registry Sync | Link Bill to Appointment
    if (appointmentId) {
      await Appointment.findByIdAndUpdate(appointmentId, {
        isBilled: true,
        billId: invoice._id
      });
    }

    // 6. Clinical Sync | Adjust Inventory Stock Levels
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
    const existing = await Invoice.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: '🚫 Invoice Not Found.' });

    const updateData = { ...req.body };

    // 🎯 Step 1: Recalculate Totals if Items/Discount are provided
    if (req.body.items || typeof req.body.discount !== 'undefined') {
        const items = req.body.items || existing.items;
        const discount = typeof req.body.discount !== 'undefined' ? Number(req.body.discount) : existing.discount;
        const tax = typeof req.body.tax !== 'undefined' ? Number(req.body.tax) : existing.tax;

        const subtotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        const amount = (subtotal - discount) + tax;

        updateData.subtotal = subtotal;
        updateData.amount = amount;
        
        // Sanitize items
        updateData.items = items.map(item => ({
            ...item,
            serviceId: item.serviceId === '' ? undefined : item.serviceId,
            inventoryId: item.inventoryId === '' ? undefined : item.inventoryId
        }));
    }

    // 🎯 Step 2: Synchronize Balance | [New Amount] - [Existing Paid]
    const finalAmount = typeof updateData.amount !== 'undefined' ? updateData.amount : existing.amount;
    const currentPaid = existing.paidAmount || 0;
    updateData.balanceAmount = finalAmount - currentPaid;

    // 🎯 Step 3: Auto-Status Transition
    if (currentPaid > finalAmount) {
      updateData.status = 'Advance';
    } else if (currentPaid === finalAmount && finalAmount > 0) {
      updateData.status = 'Paid';
    } else if (currentPaid > 0) {
      updateData.status = 'Partially Paid';
    } else {
      updateData.status = 'Unpaid';
    }

    const invoice = await Invoice.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('patientId', 'name phone patientId')
      .populate('createdBy', 'name');
    res.json(invoice);
  } catch (err) {
    console.error('🚫 Ledger Update Error:', err);
    res.status(400).json({ message: '🚫 Financial Error | Modification failed.', details: err.message });
  }
};

// @desc    Record Additional Payment for Invoice
// @route   POST /api/invoices/:id/payments
export const recordPayment = async (req, res) => {
  try {
    const { amount, method, date, note } = req.body;
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) return res.status(404).json({ message: '🚫 Invoice Not Found.' });

    // 1. Add to Payment Log
    const newPayment = {
      amount: Number(amount),
      method,
      date: date || new Date().toISOString().split('T')[0],
      note
    };

    invoice.payments.push(newPayment);

    // 2. Recalculate Financials
    invoice.paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    invoice.balanceAmount = invoice.amount - invoice.paidAmount;

    // 3. Update Status
    if (invoice.paidAmount > invoice.amount) {
      invoice.status = 'Advance';
    } else if (invoice.paidAmount === invoice.amount) {
      invoice.status = 'Paid';
    } else if (invoice.paidAmount > 0) {
      invoice.status = 'Partially Paid';
    } else {
      invoice.status = 'Unpaid';
    }

    await invoice.save();

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('patientId', 'name phone patientId')
      .populate('createdBy', 'name');

    res.json(populatedInvoice);
  } catch (err) {
    console.error('🚫 Ledger Error | Payment Entry Failed:', err);
    res.status(400).json({ message: '🚫 Financial Error | Payment could not be recorded.' });
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
