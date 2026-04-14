import mongoose from 'mongoose';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import Invoice from '../models/Invoice.js';
import Attendance from '../models/Attendance.js';
import Expense from '../models/Expense.js';
import Inventory from '../models/Inventory.js';

// -------------------------------------------------------------------
// UTILITY | Date Query Builder
// Both appointments and invoices store `date` as a string (YYYY-MM-DD)
// Patients/expenses use `createdAt` (Date object)
// -------------------------------------------------------------------
const buildStringDateQuery = (startDate, endDate) => {
  // For string date fields (YYYY-MM-DD), use lexicographic comparison
  const q = {};
  if (startDate) {
    const s = new Date(startDate).toISOString().split('T')[0];
    q.$gte = s;
  }
  if (endDate) {
    const e = new Date(endDate).toISOString().split('T')[0];
    q.$lte = e;
  }
  return q;
};

const buildDateObjectQuery = (startDate, endDate) => {
  const q = {};
  if (startDate) q.$gte = new Date(startDate);
  if (endDate) q.$lte = new Date(endDate);
  return q;
};

const getTodayString = () => {
  // Use local date string to match what the frontend sends (YYYY-MM-DD)
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// @route   GET /api/stats/dashboard
export const getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const today = getTodayString();

    // Build queries
    const stringDateFilter = (startDate || endDate) 
      ? buildStringDateQuery(startDate, endDate) 
      : null;
    
    const dateObjectFilter = (startDate || endDate)
      ? buildDateObjectQuery(startDate, endDate)
      : null;

    const [
      totalPatients,
      filteredAppointments,
      filteredInvoices,
      filteredExpenses,
      todayAppointments,
      todayInvoices
    ] = await Promise.all([
      // Total patients — filter by createdAt if dates provided
      Patient.countDocuments(dateObjectFilter ? { createdAt: dateObjectFilter } : {}),
      
      // Appointments — filter by string date field
      Appointment.find(stringDateFilter ? { date: stringDateFilter } : {}),
      
      // Invoices — filter by string date field
      Invoice.find(stringDateFilter ? { date: stringDateFilter } : {}),
      
      // Expenses — filter by string date field
      Expense.find(stringDateFilter ? { date: stringDateFilter } : {}),
      
      // Today's appointments — exact string match
      Appointment.countDocuments({ date: today }),
      
      // Today's invoices — exact string match
      Invoice.find({ date: today })
    ]);

    // Revenue = Paid invoices only
    const paidInvoices = filteredInvoices.filter(inv => inv.status === 'Paid');
    const pendingInvoices = filteredInvoices.filter(inv => inv.status !== 'Paid');
    
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalPending = pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalProfit = totalRevenue - totalExpenses;
    const todayRevenue = todayInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

    // Revenue trend (by date)
    const revenueTrends = filteredInvoices.reduce((acc, inv) => {
      const key = inv.date; // Already YYYY-MM-DD
      acc[key] = (acc[key] || 0) + (inv.amount || 0);
      return acc;
    }, {});

    // Appointment status distribution
    const appointmentDistribution = filteredAppointments.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    // 👨‍⚕️ Specialist Workload (Doctor-wise volume)
    const doctorWorkload = filteredAppointments.reduce((acc, app) => {
      const name = app.doctorName || 'Unassigned';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    res.json({
      summary: {
        totalPatients,
        totalAppointments: filteredAppointments.length,
        totalRevenue,        // Paid invoices only
        totalPending,        // Unpaid + Partially paid
        totalExpenses,
        totalProfit,
        todayAppointments,
        todayInvoices: todayInvoices.length,
        todayRevenue
      },
      trends: Object.entries(revenueTrends)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, value]) => ({ name, value })),
      distribution: Object.entries(appointmentDistribution)
        .map(([status, count]) => ({ status, count })),
      doctorWorkload: Object.entries(doctorWorkload)
        .sort((a, b) => b[1] - a[1]) // Sort by volume descending
        .map(([name, count]) => ({ name, count }))
    });
  } catch (err) {
    console.error('🚫 Dashboard Stats Error:', err);
    res.status(500).json({ message: 'Internal Server Error | Analytics failed.' });
  }
};

// @route   GET /api/stats/financial
export const getFinancialStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const stringDateFilter = (startDate || endDate) ? buildStringDateQuery(startDate, endDate) : null;

    const [invoices, expenses] = await Promise.all([
      Invoice.find(stringDateFilter ? { date: stringDateFilter } : {}),
      Expense.find(stringDateFilter ? { date: stringDateFilter } : {})
    ]);

    const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalPending = invoices
      .filter(inv => inv.status !== 'Paid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Revenue Trends (Normalized by Date)
    const revenueTrends = invoices.reduce((acc, inv) => {
      const key = inv.date;
      acc[key] = (acc[key] || 0) + (inv.amount || 0);
      return acc;
    }, {});

    // Expense Trends (Normalized by Date)
    const expenseTrends = expenses.reduce((acc, exp) => {
      const key = exp.date;
      acc[key] = (acc[key] || 0) + (exp.amount || 0);
      return acc;
    }, {});

    // Category Breakdown (Expenses)
    const categoryBreakdown = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + (exp.amount || 0);
      return acc;
    }, {});

    // Combine trends into a unified format for multi-layer charts
    const allDates = Array.from(new Set([...Object.keys(revenueTrends), ...Object.keys(expenseTrends)]))
      .sort((a, b) => a.localeCompare(b));

    const combinedTrends = allDates.map(date => ({
      name: date,
      revenue: revenueTrends[date] || 0,
      expense: expenseTrends[date] || 0,
      profit: (revenueTrends[date] || 0) - (expenseTrends[date] || 0)
    }));

    res.json({
      summary: { 
        totalRevenue, 
        totalPending, 
        totalExpenses, 
        totalProfit,
        profitMargin: parseFloat(profitMargin.toFixed(1)),
        avgRevenuePerDay: allDates.length > 0 ? totalRevenue / allDates.length : 0
      },
      trends: combinedTrends,
      categoryBreakdown: Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value }))
    });
  } catch (err) {
    console.error('🚫 Financial Stats Error:', err);
    res.status(500).json({ message: 'Financial API Error' });
  }
};


// @route   GET /api/stats/appointments
export const getAppointmentStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const today = getTodayString();
    const stringDateFilter = (startDate || endDate) ? buildStringDateQuery(startDate, endDate) : null;

    const [filteredAppointments, todayAppointments] = await Promise.all([
      Appointment.find(stringDateFilter ? { date: stringDateFilter } : {}),
      Appointment.countDocuments({ date: today }),
    ]);

    const distribution = filteredAppointments.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      summary: {
        totalAppointments: filteredAppointments.length,
        todayAppointments
      },
      distribution: Object.entries(distribution).map(([status, count]) => ({ status, count }))
    });
  } catch (err) {
    console.error('🚫 Appointment Stats Error:', err);
    res.status(500).json({ message: 'Appointments API Error' });
  }
};

// @route   GET /api/stats/patients
export const getPatientStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateObjectFilter = (startDate || endDate) ? buildDateObjectQuery(startDate, endDate) : null;
    const totalPatients = await Patient.countDocuments(
      dateObjectFilter ? { createdAt: dateObjectFilter } : {}
    );
    res.json({ summary: { totalPatients } });
  } catch (err) {
    console.error('🚫 Patient Stats Error:', err);
    res.status(500).json({ message: 'Patients API Error' });
  }
};

// @route   GET /api/stats/inventory
export const getInventoryStats = async (req, res) => {
  try {
    const items = await Inventory.find({});
    const lowStockAlerts = items.filter(item => item.quantity <= (item.reorderLevel || item.minThreshold || 5));

    res.json({
      summary: { totalItems: items.length, lowStockCount: lowStockAlerts.length },
      alerts: lowStockAlerts
    });
  } catch (err) {
    console.error('🚫 Inventory Stats Error:', err);
    res.status(500).json({ message: 'Inventory API Error' });
  }
};

// @route   GET /api/stats/attendance
export const getAttendanceStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to today if no dates provided
    let filter = {};
    if (startDate || endDate) {
      filter = buildDateObjectQuery(startDate, endDate);
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filter = { $gte: today, $lt: tomorrow };
    }

    const activeAttendance = await Attendance.find({
      checkIn: filter
    }).populate('staffId', 'name role');

    const statusCounts = activeAttendance.reduce((acc, log) => {
      acc[log.status] = (acc[log.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      summary: {
        totalPresent: activeAttendance.filter(a => !a.checkOut).length,
        totalCheckedIn: activeAttendance.length,
        statusCounts
      },
      activeLogs: activeAttendance
    });
  } catch (err) {
    console.error('🚫 Attendance Stats Error:', err);
    res.status(500).json({ message: 'Attendance API Error' });
  }
};
