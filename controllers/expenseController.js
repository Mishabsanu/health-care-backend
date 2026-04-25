import Expense from '../models/Expense.js';

// @desc    Retrieve Clinical Expenses
// @route   GET /api/expenses
export const getExpenses = async (req, res) => {
  try {
    const { search, category, startDate, endDate, page = 1, limit = 10, status, staffId } = req.query;
    let query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (staffId) query.staffId = staffId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { id: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } },
        { invoiceNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Expense.countDocuments(query);
    
    // Calculate Total Amount for current filters
    const totalAmountResult = await Expense.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;

    const expenses = await Expense.find(query)
        .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      data: expenses,
      total,
      totalAmount,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Registry Error | Backend Fetch:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Retrieve Single Expense
// @route   GET /api/expenses/:id
export const getExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) return res.status(404).json({ message: 'Expense Not Found.' });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Register New Clinical Expense
// @route   POST /api/expenses
export const createExpense = async (req, res) => {
  try {
    const { category, staffId } = req.body;

    // Generate Expense ID (Professional Format: EXP-XXXX)
    const count = await Expense.countDocuments();
    const expenseId = `EXP-${(count + 1).toString().padStart(4, '0')}`;

    const expense = await Expense.create({
      ...req.body,
      id: expenseId,
      createdBy: req.user?.id
    });
    res.status(201).json(expense);
  } catch (err) {
    console.error('❌ Expense Registry Error:', err);
    res.status(400).json({
      message: err.name === 'ValidationError'
        ? `Validation Error | ${Object.values(err.errors)?.map(e => e.message).join(', ')}`
        : 'Operational Error | Registry failed.'
    });
  }
};

// @desc    Modify Expense
// @route   PUT /api/expenses/:id
export const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!expense) return res.status(404).json({ message: 'Expense Not Found.' });
    res.json(expense);
  } catch (err) {
    res.status(400).json({ message: 'Operational Error | Modification failed.' });
  }
};

// @desc    Clear Expense Record
// @route   DELETE /api/expenses/:id
export const deleteExpense = async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: '🛡️ Expense Record Cleared.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
