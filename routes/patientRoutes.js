import express from 'express';
const router = express.Router();
import multer from 'multer';
import path from 'path';
import { getPatients, getPatientsDropdown, createPatient, updatePatient, deletePatient, getPatientById, addTreatment, uploadDocument } from '../controllers/patientController.js';
import { protect, hasPermission } from '../middleware/authMiddleware.js';

// -------------------------------------------------------------------
// PUBLIC | Patient Hub (Protected Access)
// -------------------------------------------------------------------
router.get('/', protect, hasPermission('patients:view'), getPatients);
router.get('/dropdown', protect, getPatientsDropdown); // Simplified access for selectors

// -------------------------------------------------------------------
// STORAGE | Multer Configuration for Clinical Documents
// -------------------------------------------------------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/patients/');
    },
    filename: (req, file, cb) => {
        cb(null, `DOC-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// @access  Authorized Specialists Only
router.get('/:id', protect, hasPermission('patients:view'), getPatientById);
router.post('/:id/treatments', protect, hasPermission('patients:edit'), addTreatment);
router.post('/:id/documents', protect, hasPermission('patients:edit'), upload.single('file'), uploadDocument);
router.post('/', protect, hasPermission('patients:create'), createPatient);
router.put('/:id', protect, hasPermission('patients:edit'), updatePatient);
router.delete('/:id', protect, hasPermission('patients:delete'), deletePatient);

export default router;
