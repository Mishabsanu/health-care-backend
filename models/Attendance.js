import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['Staff'], 
    required: true 
  },
  staffId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  checkIn: { 
    type: Date, 
    default: Date.now 
  },
  checkOut: { 
    type: Date 
  },
  status: { 
    type: String, 
    enum: ['Present', 'Away'], 
    default: 'Present' 
  },
  note: { 
    type: String 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Operational Indexing
attendanceSchema.index({ staffId: 1, type: 1, checkIn: -1 });

export default mongoose.model('Attendance', attendanceSchema);
