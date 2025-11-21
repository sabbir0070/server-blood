// backend/routes/patients.js
const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');

// POST /api/patients - Register a new patient
router.post('/', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      city,
      state,
      zipCode,
      country,
      medicalConditions,
      currentMedications,
      allergies,
      emergencyContactName,
      emergencyContactPhone,
      eventInterest,
      preferredSession,
      preferredTimeSlot,
      questions,
      howDidYouHear,
      additionalNotes
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !dateOfBirth || !gender) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields. Please fill all required fields.' 
      });
    }

    // Check if email already exists
    const existingPatient = await Patient.findOne({ email: email.trim().toLowerCase() });
    if (existingPatient) {
      return res.status(400).json({ 
        success: false, 
        error: 'A patient with this email already exists.' 
      });
    }

    const patient = new Patient({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.toString().trim(),
      dateOfBirth: new Date(dateOfBirth),
      gender: gender.trim(),
      address: address ? address.trim() : '',
      city: city ? city.trim() : '',
      state: state ? state.trim() : '',
      zipCode: zipCode ? zipCode.trim() : '',
      country: country ? country.trim() : 'USA',
      medicalConditions: medicalConditions ? medicalConditions.trim() : '',
      currentMedications: currentMedications ? currentMedications.trim() : '',
      allergies: allergies ? allergies.trim() : '',
      emergencyContactName: emergencyContactName ? emergencyContactName.trim() : '',
      emergencyContactPhone: emergencyContactPhone ? emergencyContactPhone.trim() : '',
      eventInterest: eventInterest ? eventInterest.trim() : '',
      preferredSession: preferredSession ? preferredSession.trim() : '',
      preferredTimeSlot: preferredTimeSlot ? preferredTimeSlot.trim() : '',
      questions: questions ? questions.trim() : '',
      howDidYouHear: howDidYouHear ? howDidYouHear.trim() : '',
      additionalNotes: additionalNotes ? additionalNotes.trim() : ''
    });

    await patient.save();
    res.status(201).json({ success: true, patient });
  } catch (err) {
    console.error('Patient registration error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        error: Object.values(err.errors).map(e => e.message).join(', ') 
      });
    }
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Server error. Please try again.' 
    });
  }
});

// GET /api/patients - Get all patients (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { search, eventInterest, sort } = req.query;
    const filter = {};

    if (eventInterest) filter.eventInterest = eventInterest;
    if (search) {
      const s = new RegExp(search, 'i');
      filter.$or = [
        { firstName: s }, 
        { lastName: s }, 
        { email: s },
        { phone: s }
      ];
    }

    let q = Patient.find(filter);

    if (sort === 'newest') q = q.sort({ createdAt: -1 });
    else if (sort === 'oldest') q = q.sort({ createdAt: 1 });
    else if (sort === 'name') q = q.sort({ lastName: 1, firstName: 1 });

    const patients = await q.exec();
    res.json({ success: true, patients, count: patients.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/patients/:id - Get a specific patient
router.get('/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
    res.json({ success: true, patient });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
