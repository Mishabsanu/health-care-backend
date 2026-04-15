import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Expense from '../models/Expense.js';

// @desc    Retrieve Management Payroll Dashboard (Historical)
// @route   GET /api/payroll/registry
export const getPayrollRegistry = async (req, res) => {
  try {

    const { search, page = 1, limit = 10, status } = req.query;

    // Period Context | Defaults to Current Month
    const targetMonth = req.query.month || new Date().toISOString().slice(5, 7); // MM
    const targetYear = req.query.year || new Date().getFullYear().toString();   // YYYY
    const periodString = `${targetYear}-${targetMonth}`; // YYYY-MM

    // DATE RANGE for Attendance (Month Start to Month End)
    const startDate = new Date(targetYear, parseInt(targetMonth) - 1, 1);
    const endDate = new Date(targetYear, parseInt(targetMonth), 0, 23, 59, 59);

    // 1. Fetch Potential Staff (Exclude Super Admins/Owners)
    let query = {};

    if (status) query.status = status;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    const allStaff = await User.find(query).populate('role').sort({ name: 1 });

    // 🛡️ Policy: Only show employees (Hide Owners and roles with Global Bypass)
    let staff = allStaff?.filter(member => member.role && !member.role.allAccess);
    const total = staff.length;

    // Apply Pagination manually since we have to filter by 'allAccess' dynamically from populated roles
    const skip = (parseInt(page) - 1) * parseInt(limit);
    staff = staff.slice(skip, skip + parseInt(limit));

    const staffIds = staff.map(s => s._id);

    // 2. Bulk Execution | Fetch all relevant records for the period in single round-trips
    const [allLogs, allPeriodPayments] = await Promise.all([
      Attendance.find({
        staffId: { $in: staffIds },
        checkIn: { $gte: startDate, $lte: endDate },
        status: { $in: ['Present', 'Open', 'Closed'] }
      }),
      Expense.find({
        staffId: { $in: staffIds },
        category: 'Salaries',
        date: { $regex: `^${periodString}` }
      })
    ]);

    // 3. Transformation Center | Map and Aggregate in Memory
    const registry = staff.map(member => {
      const logs = allLogs.filter(l => l.staffId.toString() === member._id.toString());
      const periodPayment = allPeriodPayments.find(p => p.staffId?.toString() === member._id.toString());

      const workedDays = new Set(logs.map(l => new Date(l.checkIn).toDateString())).size;
      
      let totalHours = 0;
      let totalOvertimeHours = 0;
      const expectedHours = member.salaryConfig?.expectedHoursPerDay || 8;

      logs.forEach(log => {
        if (log.checkIn && log.checkOut) {
          const durationHrs = (new Date(log.checkOut).getTime() - new Date(log.checkIn).getTime()) / (1000 * 60 * 60);
          totalHours += Math.min(durationHrs, expectedHours);
          totalOvertimeHours += Math.max(0, durationHrs - expectedHours);
        }
      });

      // Dynamic Salary Calculation
      const config = member.salaryConfig || {};
      let calculatedNetSalary = 0;

      if (config.type === 'Hourly') {
        const basePay = totalHours * (config.rate || 0);
        const otPay = totalOvertimeHours * (config.overtimeRate || (config.rate || 0) * 1.5);
        calculatedNetSalary = basePay + otPay;
      } else if (config.type === 'Daily') {
        calculatedNetSalary = workedDays * (config.rate || 0);
      } else {
        calculatedNetSalary = (member.salaryDetails?.basicSalary || 0) + (member.salaryDetails?.allowance || 0) - (member.salaryDetails?.deduction || 0);
      }

      const joinDate = member.joinDate || member.createdAt;
      const tenureDays = Math.floor((new Date() - new Date(joinDate)) / (1000 * 60 * 60 * 24));

      return {
        _id: member._id,
        name: member.name,
        role: member.role?.name,
        joinDate: joinDate,
        tenureDays: tenureDays > 0 ? tenureDays : 0,
        workedDays,
        totalHours: parseFloat(totalHours.toFixed(2)),
        overtimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
        salaryDetails: {
          ...member.salaryDetails,
          netSalary: parseFloat(calculatedNetSalary.toFixed(2))
        },
        salaryConfig: config,
        bankDetails: {
          bankName: member.bankName,
          accountNumber: member.accountNumber ? `****${member.accountNumber.slice(-4)}` : 'Not Set'
        },
        paymentStatus: periodPayment ? 'Paid' : 'Pending',
        lastPaymentDate: periodPayment?.date || 'No record for period',
        period: periodString
      };
    });

    res.json({
      data: registry,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('🚫 Registry Error | Payroll processing failed:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Retrieve Aggregated Payroll Parameters for a specific staff member
// @route   GET /api/payroll/staff/:id/parameters
export const getStaffPayrollParameters = async (req, res) => {
  try {
    const { id } = req.params;
    const targetMonth = req.query.month || new Date().toISOString().slice(5, 7);
    const targetYear = req.query.year || new Date().getFullYear().toString();
    const periodString = `${targetYear}-${targetMonth}`;

    const startDate = new Date(targetYear, parseInt(targetMonth) - 1, 1);
    const endDate = new Date(targetYear, parseInt(targetMonth), 0, 23, 59, 59);

    const member = await User.findById(id).populate('role');
    if (!member) return res.status(404).json({ message: 'Staff not found' });

    const [logs, periodPayment] = await Promise.all([
      Attendance.find({
        staffId: id,
        checkIn: { $gte: startDate, $lte: endDate },
        status: { $in: ['Present', 'Open', 'Closed'] }
      }),
      Expense.find({
        staffId: id,
        category: 'Salaries',
        date: { $regex: `^${periodString}` }
      })
    ]);

    const workedDays = new Set(logs.map(l => new Date(l.checkIn).toDateString())).size;
    let totalHours = 0;
    let totalOvertimeHours = 0;
    const expectedHours = member.salaryConfig?.expectedHoursPerDay || 8;

    logs.forEach(log => {
      if (log.checkIn && log.checkOut) {
        const durationHrs = (new Date(log.checkOut).getTime() - new Date(log.checkIn).getTime()) / (1000 * 60 * 60);
        totalHours += Math.min(durationHrs, expectedHours);
        totalOvertimeHours += Math.max(0, durationHrs - expectedHours);
      }
    });

    const config = member.salaryConfig || {};
    let calculatedNetSalary = 0;
    if (config.type === 'Hourly') {
      const basePay = totalHours * (config.rate || 0);
      const otPay = totalOvertimeHours * (config.overtimeRate || (config.rate || 0) * 1.5);
      calculatedNetSalary = basePay + otPay;
    } else if (config.type === 'Daily') {
      calculatedNetSalary = workedDays * (config.rate || 0);
    } else {
      calculatedNetSalary = (member.salaryDetails?.basicSalary || 0) + (member.salaryDetails?.allowance || 0) - (member.salaryDetails?.deduction || 0);
    }

    const joinDate = member.joinDate || member.createdAt;
    const tenureDays = Math.floor((new Date() - new Date(joinDate)) / (1000 * 60 * 60 * 24));

    res.json({
      _id: member._id,
      name: member.name,
      role: member.role,
      joinDate,
      tenureDays: tenureDays > 0 ? tenureDays : 0,
      workedDays,
      totalHours: parseFloat(totalHours.toFixed(2)),
      overtimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
      salaryDetails: {
        ...member.salaryDetails,
        netSalary: parseFloat(calculatedNetSalary.toFixed(2))
      },
      salaryConfig: config,
      bankDetails: {
        bankName: member.bankName,
        accountNumber: member.accountNumber ? `****${member.accountNumber.slice(-4)}` : 'Not Set'
      },
      paymentStatus: periodPayment ? 'Paid' : 'Pending',
      lastPaymentDate: periodPayment?.date || 'No record for period',
      period: periodString
    });
  } catch (err) {
    console.error('🚫 Parameter Error | Failed to fetch staff payroll details:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Retrieve Compensation Profile for a specific staff member (snapshot)
// @route   GET /api/payroll/staff/:id
export const getStaffPayrollProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await User.findById(id).populate('role');
    if (!staff) return res.status(404).json({ message: 'Specialist not found' });

    res.json({
        _id: staff._id,
        name: staff.name,
        role: staff.role,
        joinDate: staff.joinDate || staff.createdAt,
        salaryDetails: staff.salaryDetails || { basicSalary: 0, allowance: 0, deduction: 0, netSalary: 0 },
        salaryConfig: staff.salaryConfig || { type: 'Monthly', rate: 0, overtimeRate: 0 },
        bankDetails: {
            bankName: staff.bankName || 'Not Provided',
            accountNumber: staff.accountNumber || 'Not Set'
        },
        tenureDays: Math.floor((new Date().getTime() - new Date(staff.joinDate || staff.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    });
  } catch (err) {
    console.error('🚫 Profile Error | Failed to fetch compensation profile:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Retrieve Daily Attendance Map for specific staff
// @route   GET /api/payroll/staff/:id/attendance
export const getStaffAttendanceMonthly = async (req, res) => {
  try {
    const { id } = req.params;
    const targetMonth = req.query.month || new Date().toISOString().slice(5, 7);
    const targetYear = req.query.year || new Date().getFullYear().toString();

    const startDate = new Date(targetYear, parseInt(targetMonth) - 1, 1);
    const endDate = new Date(targetYear, parseInt(targetMonth), 0, 23, 59, 59);
    const daysInMonth = endDate.getDate();

    const logs = await Attendance.find({
      staffId: id,
      checkIn: { $gte: startDate, $lte: endDate }
    }).sort({ checkIn: 1 });

    const attendanceMap = {};

    // Initialize map with empty/absent
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(targetYear, parseInt(targetMonth) - 1, d);
      const dayOfWeek = date.getDay(); // 0 = Sunday
      attendanceMap[d] = {
        status: 'Absent',
        isSunday: dayOfWeek === 0
      };
    }

    // Fill with actual data
    logs.forEach(log => {
      const day = new Date(log.checkIn).getDate();
      attendanceMap[day] = {
        ...attendanceMap[day],
        status: 'Present',
        checkIn: log.checkIn,
        checkOut: log.checkOut,
        duration: log.checkOut ? parseFloat(((new Date(log.checkOut) - new Date(log.checkIn)) / (1000 * 60 * 60)).toFixed(2)) : 0
      };
    });

    res.json({
      staffId: id,
      period: `${targetYear}-${targetMonth}`,
      days: attendanceMap,
      summary: {
        totalPresent: logs.length,
        totalDays: daysInMonth
      }
    });
  } catch (err) {
    console.error('🚫 Attendance Analytics Error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
