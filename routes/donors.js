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

// POST /api/donors  (multipart/form-data) - Now supports authenticated users
router.post('/', upload.single('avatar'), require('../middleware/auth').optionalAuth, async (req, res) => {
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
      email,
      lastDonation,
      donationsCount,
      medicalConditions,
      visibility
    } = req.body;

    const avatarPath = req.file ? `/uploads/${req.file.filename}` : null;

    // Validate required fields (phone is now optional)
    if (!name || !bloodGroup || !gender || !district || !upazila || !area) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields. Please fill all required fields.' 
      });
    }

    // Get user email from authenticated user if available, otherwise use form email
    const userEmail = req.user?.email?.toLowerCase() || req.body.email?.trim().toLowerCase();
    const userId = req.user?._id?.toString();

    // Check if donor with same email AND blood group already exists
    let existingDonor = null;
    if (userEmail && bloodGroup) {
      existingDonor = await Donor.findOne({ 
        email: userEmail,
        bloodGroup: bloodGroup 
      });
      if (existingDonor) {
        return res.status(400).json({ 
          success: false, 
          error: 'You are already registered as a donor with this email and blood group combination.' 
        });
      }
    }
    
    // Also check by email only (if blood group combination not found)
    if (userEmail && !existingDonor) {
      existingDonor = await Donor.findOne({ email: userEmail });
      if (existingDonor) {
        return res.status(400).json({ 
          success: false, 
          error: 'You are already registered as a donor with this email.' 
        });
      }
    }

    // Process phone number (optional)
    let phoneNum = null;
    if (phone) {
      phoneNum = Number(phone.toString().trim());
      if (isNaN(phoneNum)) {
        phoneNum = null; // Invalid format, treat as optional
      }
    }

    const donorData = {
      name: name.trim(),
      bloodGroup,
      gender,
      district: district.trim(),
      upazila: upazila.trim(),
      area: area.trim(),
      address: address ? address.trim() : '',
      phone: phoneNum,
      email: userEmail || null,
      userId: userId || null,
      visibility: visibility === 'only_me' ? 'only_me' : 'public',
      dob: dob ? new Date(dob) : null,
      lastDonation: lastDonation ? new Date(lastDonation) : null,
      donationsCount: donationsCount ? Number(donationsCount) : 0,
      medicalConditions: medicalConditions || ''
    };

    // Only add avatar if file was uploaded
    if (avatarPath) {
      donorData.avatar = avatarPath;
    }

    const donor = new Donor(donorData);

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
    const { bloodGroup, gender, search, sort, includeBlocked } = req.query;
    const filter = {};

    // By default, exclude blocked donors unless explicitly requested
    if (includeBlocked !== 'true') {
      filter.isBlocked = { $ne: true };
    }

    // Donor list page shows ALL donors regardless of visibility setting
    // Visibility setting is for user's own profile management, not for public donor list
    // No visibility filter applied here - all donors are visible in the list

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

// PATCH /api/donors/:id/block - Block a donor (admin only)
router.patch('/:id/block', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const donor = await Donor.findById(req.params.id);
    if (!donor) {
      return res.status(404).json({ success: false, error: 'Donor not found' });
    }

    donor.isBlocked = true;
    donor.blockedAt = new Date();
    donor.blockedBy = req.user._id.toString();
    await donor.save();

    res.json({ success: true, message: 'Donor blocked successfully', donor });
  } catch (err) {
    console.error('Block donor error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

// PATCH /api/donors/:id/unblock - Unblock a donor (admin only)
router.patch('/:id/unblock', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const donor = await Donor.findById(req.params.id);
    if (!donor) {
      return res.status(404).json({ success: false, error: 'Donor not found' });
    }

    donor.isBlocked = false;
    donor.blockedAt = null;
    donor.blockedBy = null;
    await donor.save();

    res.json({ success: true, message: 'Donor unblocked successfully', donor });
  } catch (err) {
    console.error('Unblock donor error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

// GET /api/donors/blocked/list - Get all blocked donors (admin only)
router.get('/blocked/list', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const blockedDonors = await Donor.find({ isBlocked: true }).sort({ blockedAt: -1 });
    res.json({ success: true, donors: blockedDonors });
  } catch (err) {
    console.error('Get blocked donors error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

// GET /api/donors/check/me - Check if current user is already a donor
router.get('/check/me', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    const user = req.user;
    const userEmail = user.email?.toLowerCase();
    const bloodGroup = req.query.bloodGroup; // Get blood group from query parameter

    // Check by email AND blood group combination
    let donor = null;
    if (userEmail && bloodGroup) {
      donor = await Donor.findOne({ 
        email: userEmail,
        bloodGroup: bloodGroup 
      });
    }

    // If not found with email+bloodGroup, check by email only
    if (!donor && userEmail) {
      donor = await Donor.findOne({ email: userEmail });
    }

    if (donor) {
      const donorObj = donor.toJSON();
      // Add calculated availability
      donorObj.actualAvailability = donor.getAvailability();
      return res.json({ 
        success: true, 
        isRegistered: true,
        donor: donorObj,
        message: 'You are already registered as a donor.' 
      });
    }

    res.json({ 
      success: true, 
      isRegistered: false,
      message: 'Not registered as donor yet' 
    });
  } catch (err) {
    console.error('Check donor registration error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

// GET /api/donors/me - Get current user's donor profile
router.get('/me', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    const user = req.user;
    const userEmail = user.email?.toLowerCase();

    // Check by email first, then phone, then userId
    let donor = null;
    if (userEmail) {
      donor = await Donor.findOne({ email: userEmail });
    }

    if (!donor && user.phone) {
      const phoneNum = Number(user.phone.toString().trim());
      if (!isNaN(phoneNum)) {
        donor = await Donor.findOne({ phone: phoneNum });
      }
    }

    if (!donor && user._id) {
      donor = await Donor.findOne({ userId: user._id.toString() });
    }

    if (!donor) {
      return res.status(404).json({ 
        success: false, 
        error: 'Donor profile not found' 
      });
    }

    const donorObj = donor.toJSON();
    donorObj.actualAvailability = donor.getAvailability();
    
    res.json({ 
      success: true, 
      donor: donorObj
    });
  } catch (err) {
    console.error('Get donor profile error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

// PUT /api/donors/me - Update current user's donor profile
router.put('/me', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    const user = req.user;
    const userEmail = user.email?.toLowerCase();

    // Find donor by email, phone, or userId
    let donor = null;
    if (userEmail) {
      donor = await Donor.findOne({ email: userEmail });
    }

    if (!donor && user.phone) {
      const phoneNum = Number(user.phone.toString().trim());
      if (!isNaN(phoneNum)) {
        donor = await Donor.findOne({ phone: phoneNum });
      }
    }

    if (!donor && user._id) {
      donor = await Donor.findOne({ userId: user._id.toString() });
    }

    if (!donor) {
      return res.status(404).json({ 
        success: false, 
        error: 'Donor profile not found' 
      });
    }

    // Update allowed fields
    const { name, bloodGroup, phone, district, upazila, area, address, lastDonation, medicalConditions, isAvailable, visibility } = req.body;
    
    if (name) donor.name = name.trim();
    if (bloodGroup) donor.bloodGroup = bloodGroup;
    if (phone !== undefined) {
      if (phone && phone.trim()) {
        const phoneNum = Number(phone.toString().trim());
        if (!isNaN(phoneNum)) {
          donor.phone = phoneNum;
        } else {
          donor.phone = null;
        }
      } else {
        donor.phone = null;
      }
    }
    if (district) donor.district = district.trim();
    if (upazila) donor.upazila = upazila.trim();
    if (area) donor.area = area.trim();
    if (address !== undefined) donor.address = address ? address.trim() : '';
    if (lastDonation) donor.lastDonation = new Date(lastDonation);
    if (medicalConditions !== undefined) donor.medicalConditions = medicalConditions || '';
    if (isAvailable !== undefined) donor.isAvailable = isAvailable === true || isAvailable === 'true';
    if (visibility !== undefined && (visibility === 'only_me' || visibility === 'public')) {
      donor.visibility = visibility;
    }

    await donor.save();

    const donorObj = donor.toJSON();
    donorObj.actualAvailability = donor.getAvailability();

    res.json({ 
      success: true, 
      message: 'Donor profile updated successfully',
      donor: donorObj
    });
  } catch (err) {
    console.error('Update donor profile error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

// PUT /api/donors/:id - Update donor by ID (admin only, or owner)
router.put('/:id', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    const user = req.user;
    const donorId = req.params.id;

    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ 
        success: false, 
        error: 'Donor not found' 
      });
    }

    // Check if user is admin OR if this is their own donor profile
    const userEmail = user.email?.toLowerCase();
    const isOwner = (donor.email && userEmail && donor.email.toLowerCase() === userEmail) ||
                   (donor.userId && user._id && donor.userId === user._id.toString()) ||
                   (donor.phone && user.phone && Number(donor.phone) === Number(user.phone));

    if (user.role !== 'admin' && !isOwner) {
      return res.status(403).json({ 
        success: false, 
        error: 'You can only edit your own profile' 
      });
    }

    // Update allowed fields
    const { name, bloodGroup, phone, district, upazila, area, address, lastDonation, medicalConditions, isAvailable, visibility } = req.body;
    
    if (name) donor.name = name.trim();
    if (bloodGroup) donor.bloodGroup = bloodGroup;
    if (phone !== undefined) {
      if (phone && phone.trim()) {
        const phoneNum = Number(phone.toString().trim());
        if (!isNaN(phoneNum)) {
          donor.phone = phoneNum;
        } else {
          donor.phone = null;
        }
      } else {
        donor.phone = null;
      }
    }
    if (district) donor.district = district.trim();
    if (upazila) donor.upazila = upazila.trim();
    if (area) donor.area = area.trim();
    if (address !== undefined) donor.address = address ? address.trim() : '';
    if (lastDonation) donor.lastDonation = new Date(lastDonation);
    if (medicalConditions !== undefined) donor.medicalConditions = medicalConditions || '';
    if (isAvailable !== undefined) donor.isAvailable = isAvailable === true || isAvailable === 'true';
    if (visibility !== undefined && (visibility === 'only_me' || visibility === 'public')) {
      donor.visibility = visibility;
    }

    await donor.save();

    const donorObj = donor.toJSON();
    donorObj.actualAvailability = donor.getAvailability();

    res.json({ 
      success: true, 
      message: 'Donor profile updated successfully',
      donor: donorObj
    });
  } catch (err) {
    console.error('Update donor by ID error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

module.exports = router;
