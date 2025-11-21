// backend/models/Patient.js
const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  // Personal Information
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, required: true },
  
  // Address Information
  address: { type: String },
  city: { type: String },
  state: { type: String },
  zipCode: { type: String },
  country: { type: String, default: 'USA' },
  
  // Medical Information
  medicalConditions: { type: String },
  currentMedications: { type: String },
  allergies: { type: String },
  emergencyContactName: { type: String },
  emergencyContactPhone: { type: String },
  
  // Event/Summit Specific (for DecentMed Summit)
  eventInterest: { type: String }, // e.g., "DecentMed Summit"
  preferredSession: { type: String }, // e.g., "Live" or "Pre-recorded"
  preferredTimeSlot: { type: String },
  questions: { type: String },
  
  // Additional Information
  howDidYouHear: { type: String },
  additionalNotes: { type: String },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Patient', PatientSchema);

