import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';

// @desc    Retrieve Clinical Appointments
// @route   GET /api/appointments
export const getAppointments = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, status } = req.query;
    // Base query
    let query = {};

    if (status) query.status = status;

    let aggregateQuery = [
      { $match: query },
      { $lookup: { from: 'patients', localField: 'patientId', foreignField: '_id', as: 'patient' } },
      { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'doctors', localField: 'doctorId', foreignField: '_id', as: 'doctor' } },
      { $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true } }
    ];

    if (search) {
      aggregateQuery.push({
        $match: {
          $or: [
            { 'patient.name': { $regex: search, $options: 'i' } },
            { 'doctor.name': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get paginated data
    aggregateQuery.push({ $sort: { createdAt: -1 } });
    const total = await Appointment.countDocuments(query);

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name phone email patientId')
      .populate('doctorId', 'name specialization')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      data: appointments,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('🚫 Registry Error | Backend Fetch:', err);
    res.status(500).json({ message: 'Internal Server Error' });
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
          time: appointment.time
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
