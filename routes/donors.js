// backend/routes/donors.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Donor = require('../models/Donor');

// multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({ storage });

// POST /api/donors  (multipart/form-data)
router.post('/', upload.single('avatar'), async (req, res) => {
  try {
    const {
      name,
      bloodGroup,
      gender,
      district,
      upazila,
      area,
      dob,
      address,
      phone,
      lastDonation,
      donationsCount,
 medicalConditions
    } = req.body;

    const avatarPath = req.file ? `/uploads/${req.file.filename}` : null;

    // Validate required fields
    if (!name || !bloodGroup || !gender || !district || !upazila || !area || !phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields. Please fill all required fields.' 
      });
    }

    const donor = new Donor({
      name: name.trim(),
      bloodGroup,
      gender,
      district: district.trim(),
      upazila: upazila.trim(),
      area: area.trim(),
      address: address ? address.trim() : '',
      phone: phone.toString().trim(),
      dob: dob ? new Date(dob) : null,
      lastDonation: lastDonation ? new Date(lastDonation) : null,
      donationsCount: donationsCount ? Number(donationsCount) : 0,
      avatar: avatarPath || '',
      medicalConditions: medicalConditions || ''
    });

    await donor.save();
    res.status(201).json({ success: true, donor });
  } catch (err) {
    console.error('Donor registration error:', err);
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

// GET /api/donors  (with optional filters: bloodGroup, gender, search, sort)
router.get('/', async (req, res) => {
  try {
    const { bloodGroup, gender, search, sort } = req.query;
    const filter = {};

    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (gender) filter.gender = { $regex: new RegExp('^' + gender + '$', 'i') };
    if (search) {
      const s = new RegExp(search, 'i');
      filter.$or = [{ name: s }, { area: s }, { district: s }, { upazila: s }];
    }

    let q = Donor.find(filter);

    if (sort === 'lastOldest') q = q.sort({ lastDonation: 1 });
    else if (sort === 'lastNewest') q = q.sort({ lastDonation: -1 });
    else if (sort === 'name') q = q.sort({ name: 1 });

    const donors = await q.exec();
    res.json({ success: true, donors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/donors/:id
router.get('/:id', async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, donor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
