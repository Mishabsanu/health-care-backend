import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  permissions: [{ type: String }], // Array of permission strings: e.g. ['Patient:View', 'Appointment:Create']
  allAccess: { type: Boolean, default: false }, // Super Admin clinical bypass
  isSystemRole: { type: Boolean, default: false }, // Protected roles like 'Owner'
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Role', roleSchema);
