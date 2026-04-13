import Patient from '../models/Patient.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';

// @desc    Retrieve Clinical Patients
// @route   GET /api/patients
export const getPatients = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, gender } = req.query;
    // Base query
    let query = {};

    // Advanced Clinical Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } }
      ];
    }


    if (gender) query.gender = gender;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    res.json({
        data: patients,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('🚫 Registry Error | Backend Fetch:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Retrieve Patients for Dropdown Selectors
// @route   GET /api/patients/dropdown
export const getPatientsDropdown = async (req, res) => {
    try {
        let query = {};
        const patients = await Patient.find(query).select('name _id patientId phone').sort({ name: 1 });
        res.json(patients);
    } catch (err) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// @desc    Register New Clinical Patient
// @route   POST /api/patients
export const createPatient = async (req, res) => {
  try {

    // 1. Generate Unique Patient ID (AKOD-P-0001)
    const company = 'AKOD';
    const totalPatients = await Patient.countDocuments();
    const sequence = (totalPatients + 1).toString().padStart(4, '0');
    const patientId = `${company}-P-${sequence}`;

    // 2. BMI Calculation (If height/weight provided)
    let bmi = 0;
    if (req.body.weight && req.body.height) {
        const heightInMeters = req.body.height / 100;
        bmi = (req.body.weight / (heightInMeters * heightInMeters)).toFixed(2);
    }

    // 3. Create Patient File
    const patient = await Patient.create({
        ...req.body,
        patientId,
        bmi,
        createdBy: req.user?.id
    });

    // 4. Trigger WhatsApp Welcome
    await sendWhatsAppMessage({
        phone: patient.phone,
        template: 'WELCOME',
        data: {
            name: patient.name,
            patientId: patient.patientId
        }
    });

    res.status(201).json(patient);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: '🚫 Registry Error | Onboarding failed.' });
  }
};

// @desc    Update Clinical Patient Profile
// @route   PUT /api/patients/:id
export const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: '🚫 Patient Registry | Not Found.' });
    res.json(patient);
  } catch (err) {
    res.status(400).json({ message: '🚫 Registry Error | Fetch failed.' });
  }
};

export const updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!patient) return res.status(404).json({ message: '🚫 Patient Registry | Not Found.' });
    res.json(patient);
  } catch (err) {
    res.status(400).json({ message: '🚫 Registry Error | Update failed.' });
  }
};

// @desc    Add Clinical Treatment Entry
// @route   POST /api/patients/:id/treatments
export const addTreatment = async (req, res) => {
  try {
    const { notes, complaint } = req.body;
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: '🚫 Patient Registry | Not Found.' });

    patient.treatments.unshift({
        notes,
        complaint: complaint || 'General Follow-up',
        date: new Date()
    });
    patient.lastVisit = new Date();
    
    await patient.save();
    res.json(patient);
  } catch (err) {
    res.status(400).json({ message: '🚫 Registry Error | Failed to log treatment.' });
  }
};

// @desc    Upload Patient Document
// @route   POST /api/patients/:id/documents
export const uploadDocument = async (req, res) => {
    try {
        const { name, type } = req.body;
        const patient = await Patient.findById(req.params.id);
        if (!patient) return res.status(404).json({ message: '🚫 Patient Registry | Not Found.' });

        if (!req.file) return res.status(400).json({ message: '🚫 Upload Error | File required.' });

        const documentUrl = `/uploads/patients/${req.file.filename}`;
        
        patient.documents.push({
            name: name || req.file.originalname,
            url: documentUrl,
            type: type || 'Clinical',
            date: new Date()
        });

        await patient.save();
        res.json(patient);
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: '🚫 Registry Error | Failed to upload document.' });
    }
};

// @desc    Delete Medical Record
// @route   DELETE /api/patients/:id
export const deletePatient = async (req, res) => {
  try {
    await Patient.findByIdAndDelete(req.params.id);
    res.json({ message: '🛡️ Patient Medical Registry Cleared.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
