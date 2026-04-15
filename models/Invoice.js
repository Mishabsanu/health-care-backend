import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  id: { type: String, required: true }, // Clinical Invoice ID (e.g., INV-001)
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  patientName: { type: String, required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  date: { type: String, required: true }, // YYYY-MM-DD
  items: [
    {
      serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
      inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, default: 1 },
      description: { type: String },
      note: { type: String }
    }
  ],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  amount: { type: Number, required: true }, // Final Total
  paidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  method: { type: String, enum: ['UPI', 'Cash', 'Card', 'Insurance'] },
  status: { type: String, enum: ['Paid', 'Unpaid', 'Partially Paid'], default: 'Unpaid' },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });


invoiceSchema.index({ date: 1 });

export default mongoose.model('Invoice', invoiceSchema);
