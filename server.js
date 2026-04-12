import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// -------------------------------------------------------------------
// MIDDLEWARE | Clinical Security and Data Parsing
// -------------------------------------------------------------------
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ["https://akod-care.vercel.app", "http://localhost:3000"],
  credentials: true
}));

// Serve Static Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -------------------------------------------------------------------
// DATABASE | Mongoose Connection Strategy
// -------------------------------------------------------------------
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('🛡️ Clinical Vault Secured: MongoDB Connected.'))
  .catch((err) => console.error('🚫 Vault Error | MongoDB Connection Failed:', err));

import authRoutes from './routes/authRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import userRoutes from './routes/userRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';

// -------------------------------------------------------------------
// ROUTES | Modular Clinical Endpoints
// -------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/stats', statsRoutes);

app.get('/', (req, res) => {
  res.send('PCMS Clinical API | Node.js Express Backend v1.0');
});

app.listen(PORT, () => {
  console.log(`🚀 PCMS Clinical Server operational on port ${PORT}`);
});
