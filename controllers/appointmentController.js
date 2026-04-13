import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';

// @desc    Retrieve Clinical Appointments
// @route   GET /api/appointments
export const getAppointments = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, status, date, timeframe, localDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // 🎯 Stage 1: Initial Match (Clinical Timeframes)
    let initialMatch = {};
    if (status) initialMatch.status = status;
    
    // 🌐 Multi-Timezone Clinical Sync: Prioritize station date over server date
    const todayStr = localDate || new Date().toISOString().split('T')[0];

    if (timeframe === 'today') {
        initialMatch.date = todayStr;
    } else if (timeframe === 'upcoming') {
        initialMatch.date = { $gt: todayStr };
    } else if (date) {
        initialMatch.date = date;
    }

    let pipeline = [
      { $match: initialMatch },
      // 🏥 Clinical Lookups
      { $lookup: { from: 'patients', localField: 'patientId', foreignField: '_id', as: 'p' } },
      { $unwind: { path: '$p', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'doctors', localField: 'doctorId', foreignField: '_id', as: 'd' } },
      { $unwind: { path: '$d', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'createdBy', foreignField: '_id', as: 'u' } },
      { $unwind: { path: '$u', preserveNullAndEmptyArrays: true } }
    ];

    // 🔍 Stage 2: Advanced Search (Related Collections)
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'p.name': { $regex: search, $options: 'i' } },
            { 'p.phone': { $regex: search, $options: 'i' } },
            { 'd.name': { $regex: search, $options: 'i' } },
            { 'p.patientId': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // 📊 Stage 3: Professional Faceting & Pagination
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $sort: { date: 1, time: 1 } },
          { $skip: skip },
          { $limit: limitInt },
          {
            $project: {
              _id: 1,
              date: 1,
              time: 1,
              status: 1,
              isBilled: 1,
              billId: 1,
              createdAt: 1,
              patientId: {
                _id: '$p._id',
                name: '$p.name',
                phone: '$p.phone',
                patientId: '$p.patientId'
              },
              doctorId: {
                _id: '$d._id',
                name: '$d.name',
                specialization: '$d.specialization'
              },
              createdBy: {
                _id: '$u._id',
                name: '$u.name'
              }
            }
          }
        ]
      }
    });

    const result = await Appointment.aggregate(pipeline);
    
    // 📦 Clinical Packaging
    const total = result[0]?.metadata[0]?.total || 0;
    const appointments = result[0]?.data || [];

    res.json({
      data: appointments,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limitInt)
    });
  } catch (err) {
    console.error('🚫 Registry Sync Error:', err);
    res.status(500).json({ message: 'Internal Server Error | Registry Sync Failed' });
  }
};

// @desc    Retrieve Single Appointment
// @route   GET /api/appointments/:id
export const getAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId', 'name')
      .populate('doctorId', 'name specialization');

    if (!appointment) return res.status(404).json({ message: '🚫 Appointment Registry | Not Found.' });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Register New Clinical Appointment
// @route   POST /api/appointments
export const createAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.create({
      ...req.body,
      createdBy: req.user.id
    });

    // 🕊️ Trigger WhatsApp Notification
    const patient = await Patient.findById(appointment.patientId);
    if (patient && patient.phone) {
      await sendWhatsAppMessage({
        phone: patient.phone,
        template: 'BOOKING',
        data: {
          name: patient.name,
          date: appointment.date,
          time: appointment.time,
          status: 'Scheduled'
        }
      });
    }

    res.status(201).json(appointment);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: '🚫 Scheduling Error | Booking failed.' });
  }
};

// @desc    Send Manual WhatsApp Reminder
// @route   POST /api/appointments/:id/reminder
export const sendReminder = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate('patientId', 'name phone');
    if (!appointment) return res.status(404).json({ message: '🚫 Appointment Registry | Not Found.' });

    if (appointment.patientId?.phone) {
      await sendWhatsAppMessage({
        phone: appointment.patientId.phone,
        template: 'REMINDER',
        data: {
          name: appointment.patientId.name,
          date: appointment.date,
          time: appointment.time
        }
      });
      return res.json({ message: '🔔 Reminder dispatched via WhatsApp.' });
    }

    res.status(400).json({ message: '🚫 Contact Error | No phone found for patient.' });
  } catch (err) {
    res.status(500).json({ message: '🚫 Gateway Error | Failed to send reminder.' });
  }
};

// @desc    Modify Appointment Details
// @route   PUT /api/appointments/:id
export const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('patientId', 'name')
      .populate('doctorId', 'name');

    if (!appointment) return res.status(404).json({ message: '🚫 Appointment Registry | Not Found.' });
    res.json(appointment);
  } catch (err) {
    res.status(400).json({ message: '🚫 Scheduling Error | Modification failed.' });
  }
};

// @desc    Clear Appointment Registry
// @route   DELETE /api/appointments/:id
export const deleteAppointment = async (req, res) => {
  try {
    await Appointment.findByIdAndDelete(req.params.id);
    res.json({ message: '🛡️ Appointment Registry Cleared.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
