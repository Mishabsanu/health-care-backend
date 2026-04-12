import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  status: { type: String, enum: ['Available', 'On Leave', 'Busy'], default: 'Available' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Doctor', doctorSchema);
