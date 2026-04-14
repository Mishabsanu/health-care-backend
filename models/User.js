import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  employeeId: { type: String, unique: true, sparse: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  // 💼 KYC & PERSONNEL METRICS
  panCard: { type: String },
  adharCard: { type: String },
  accountNumber: { type: String },
  ifscCode: { type: String },
  bankName: { type: String },
  joinDate: { type: Date, default: Date.now },
  salaryDetails: {
    basicSalary: { type: Number, default: 0 },
    allowance: { type: Number, default: 0 },
    deduction: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 }
  },
  salaryConfig: {
    type: { type: String, enum: ['Monthly', 'Daily', 'Hourly'], default: 'Monthly' },
    rate: { type: Number, default: 0 }, // Daily rate or Hourly rate
    expectedHoursPerDay: { type: Number, default: 8 },
    overtimeRate: { type: Number, default: 0 } // Extra per hour
  }
}, { timestamps: true });

// -------------------------------------------------------------------
// SECURITY | Password Hashing
// -------------------------------------------------------------------
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
