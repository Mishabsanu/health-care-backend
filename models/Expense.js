import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  id: { type: String, required: true }, // EXP-001
  date: { type: String, required: true }, // YYYY-MM-DD
  amount: { type: Number, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['Rent', 'Salaries', 'Supplies', 'Utilities', 'Maintenance', 'Marketing', 'Others']
  },
  description: { type: String },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional: Link salary payments to specific staff
  paymentMethod: { 
    type: String, 
    enum: ['UPI', 'Cash', 'Card', 'Bank Transfer'],
    default: 'Cash'
  },
  status: { 
    type: String, 
    enum: ['Paid', 'Pending'], 
    default: 'Paid' 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Optimize for financial reporting
expenseSchema.index({ date: 1 });
expenseSchema.index({ category: 1 });

export default mongoose.model('Expense', expenseSchema);
