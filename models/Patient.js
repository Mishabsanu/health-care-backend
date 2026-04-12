import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  patientId: { type: String, unique: true, required: true }, // unique clinical ID
  name: { type: String, required: true },
  phone: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  email: { type: String },
  address: { type: String, required: true },
  referredBy: { type: String },
  bmi: { type: Number },
  reasonForVisit: { type: String },
  weight: { type: Number },
  height: { type: Number },
  habits: { type: [String], default: [] },
  occupation: { type: String },
  employeeId: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  treatments: [{
    date: { type: Date, default: Date.now },
    complaint: { type: String, default: 'Primary Consult' },
    notes: { type: String },
    specialist: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }
  }],
  documents: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    date: { type: Date, default: Date.now },
    type: { type: String, default: 'Clinical' }
  }],
  lastVisit: { type: Date, default: Date.now },
}, { timestamps: true });

// -------------------------------------------------------------------
// QUERY OPTIMIZATION
// -------------------------------------------------------------------

export default mongoose.model('Patient', patientSchema);
