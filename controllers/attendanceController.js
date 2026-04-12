import Attendance from '../models/Attendance.js';
import User from '../models/User.js';

// @desc    Record Staff Check-In
// @route   POST /api/attendance/check-in
export const recordCheckIn = async (req, res) => {
  try {
    const { note, staffId: bodyStaffId } = req.body;
    // 🔑 If a manager provides a staffId in the body, use that (manager-led check-in).
    // Otherwise, default to the logged-in user's own ID (personal check-in).
    const staffId = bodyStaffId || req.user.id;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const existingActive = await Attendance.findOne({
      type: 'Staff',
      staffId,
      checkIn: { $gte: startOfDay },
      checkOut: { $exists: false }
    });

    if (existingActive) {
      return res.status(400).json({ 
        message: '🚫 Operational Error | Session already active.',
        sessionId: existingActive._id 
      });
    }

    const attendance = await Attendance.create({
      type: 'Staff',
      staffId,
      note,
      status: 'Present',
      createdBy: req.user.id
    });

    res.status(201).json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Record Staff Check-Out
// @route   PUT /api/attendance/check-out/:id
export const recordCheckOut = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ message: '🚫 Operational Error | Session not found.' });
    }

    attendance.checkOut = new Date();
    attendance.status = 'Away';
    if (note) attendance.note = note;

    await attendance.save();
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Get All Operational Statuses (Global Registry)
// @route   GET /api/attendance
export const getAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({})
      .populate('staffId', 'name position')
      .sort({ checkIn: -1 });

    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Create Manual Clinical Attendance Record
// @route   POST /api/attendance/manual
export const createManualRecord = async (req, res) => {
  try {
    const { staffId, checkIn, checkOut, note } = req.body;

    const attendance = await Attendance.create({
      type: 'Staff',
      staffId,
      checkIn,
      checkOut,
      note,
      status: 'Away',
      createdBy: req.user.id
    });

    res.status(201).json(attendance);
  } catch (err) {
    res.status(400).json({ message: '🚫 Registry Error | Data invalid.' });
  }
};

// @desc    Get Current Operational Status (Staff Present)
// @route   GET /api/attendance/status
export const getOperationalStatus = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const activeSessions = await Attendance.find({
      type: 'Staff',
      checkIn: { $gte: startOfDay },
      checkOut: { $exists: false }
    }).populate('staffId', 'name position').sort({ checkIn: -1 });

    res.json({
      staffPresent: activeSessions
        ?.filter(s => s.staffId) // 🔥 Safety: Filter out sessions for deleted users
        .map(s => ({
          id: s.staffId?._id?.toString(),
          name: s.staffId?.name,
          sessionId: s._id?.toString()
        }))
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Get Staff for Attendance Registry (Filtered by staff)
// @route   GET /api/attendance/staff
export const getAttendanceStaff = async (req, res) => {
  try {
    const query = {};

    const staff = await User.find(query)
      .select('name email role status')
      .populate('role', 'name');

    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
