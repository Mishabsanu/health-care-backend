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

    const registry = await Promise.all(staff?.map(async (member) => {
      // 2. Attendance Metrics | Days Worked IN PERIOD
      const workedDays = await Attendance.countDocuments({
        staffId: member._id,
        checkIn: { $gte: startDate, $lte: endDate },
        status: { $in: ['Present', 'Open', 'Closed'] }
      });

      // 3. Tenure Metrics | Days Since Joining (Total)
      const joinDate = member.joinDate || member.createdAt;
      const tenureDays = Math.floor((new Date() - new Date(joinDate)) / (1000 * 60 * 60 * 24));

      // 4. Payment History | PERIOD Status
      // Look for any Salary expense linked to this staff member within the target YYYY-MM
      const periodPayment = await Expense.findOne({
        staffId: member._id,
        category: 'Salaries',
        date: { $regex: `^${periodString}` }
      });

      return {
        _id: member._id,
        name: member.name,
        role: member.role?.name,
        joinDate: joinDate,
        tenureDays: tenureDays > 0 ? tenureDays : 0,
        workedDays,
        salaryDetails: member.salaryDetails,
        bankDetails: {
          bankName: member.bankName,
          accountNumber: member.accountNumber ? `****${member.accountNumber.slice(-4)}` : 'Not Set'
        },
        paymentStatus: periodPayment ? 'Paid' : 'Pending',
        lastPaymentDate: periodPayment?.date || 'No record for period',
        period: periodString
      };
    }));

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
      attendanceMap[day].status = 'Present';
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
