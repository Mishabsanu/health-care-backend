import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  patientName: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctorName: { type: String },
  date: { type: String, required: true }, // YYYY-MM-DD
  time: { type: String }, // HH:mm (Optional)
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  type: { type: String }, // General session type
  status: { type: String, enum: ['Booked', 'Completed', 'Cancelled'], default: 'Booked' },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// -------------------------------------------------------------------
// QUERY OPTIMIZATION | Clinical Scheduling
// -------------------------------------------------------------------
appointmentSchema.index({ date: 1 });

export default mongoose.model('Appointment', appointmentSchema);
