import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Consultation', 'Therapy', 'Assessment', 'Rehabilitation', 'Emergency'], 
    required: true 
  },
  price: { type: Number, required: true },
  status: { type: String, enum: ['Available', 'Archived'], default: 'Available' },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Service', serviceSchema);
