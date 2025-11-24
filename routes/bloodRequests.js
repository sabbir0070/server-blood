const express = require('express');
const router = express.Router();
const BloodRequest = require('../models/BloodRequest');
const Donor = require('../models/Donor');
const Alert = require('../models/Alert');
const { authenticate } = require('../middleware/auth');

// GET /api/blood-requests - Get all blood requests
router.get('/', async (req, res) => {
  try {
    const { status, bloodGroup } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    
    const requests = await BloodRequest.find(filter)
      .sort({ createdAt: -1 })
      .exec();
    
    res.json({ 
      success: true, 
      requests: requests 
    });
  } catch (err) {
    console.error('Error fetching blood requests:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to fetch blood requests' 
    });
  }
});

// POST /api/blood-requests - Create new blood request
router.post('/', authenticate, async (req, res) => {
  try {
    const { 
      patientName, 
      age, 
      bloodGroup, 
      neededUnits,
      hospitalName,
      hospitalAddress,
      wardBedNumber,
      phone, 
      emergencyLevel,
      neededDate,
      neededTime,
      reasonNotes
    } = req.body;
    const userId = req.user?._id?.toString() || req.user?.userId || null;
    
    // Validate required fields
    if (!patientName || !age || !bloodGroup || !neededUnits || !hospitalName || !hospitalAddress || !phone || !neededDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    const request = new BloodRequest({
      patientName: patientName.trim(),
      age: parseInt(age) || 0,
      bloodGroup,
      neededUnits: parseInt(neededUnits) || 1,
      hospitalName: hospitalName.trim(),
      hospitalAddress: hospitalAddress.trim(),
      wardBedNumber: wardBedNumber?.trim() || null,
      phone: phone.trim(),
      emergencyLevel: emergencyLevel || 'normal',
      neededDate: new Date(neededDate),
      neededTime: neededTime || '12:00',
      reasonNotes: reasonNotes?.trim() || null,
      status: 'pending',
      createdBy: userId
    });
    
    await request.save();
    
    // Create alert for new blood request
    const alert = new Alert({
      type: 'blood_request',
      title: 'New Blood Request',
      message: `${patientName} needs ${bloodGroup} blood at ${hospitalName}`,
      relatedId: request._id.toString(),
      isRead: false
    });
    await alert.save();
    
    // Find matching donors and create alerts for them
    const matchingDonors = await Donor.find({ bloodGroup });
    for (const donor of matchingDonors) {
      const donorAlert = new Alert({
        type: 'blood_request',
        title: 'Blood Request Match',
        message: `A patient needs ${bloodGroup} blood. You can help!`,
        relatedId: request._id.toString(),
        userId: donor._id.toString(),
        isRead: false
      });
      await donorAlert.save();
    }
    
    res.status(201).json({ 
      success: true, 
      request: request,
      message: 'Blood request created successfully' 
    });
  } catch (err) {
    console.error('Error creating blood request:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to create blood request' 
    });
  }
});

// PATCH /api/blood-requests/:id/accept - Accept a blood request
router.patch('/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const { donorId, donorName } = req.body;
    
    const request = await BloodRequest.findById(id);
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        error: 'Blood request not found' 
      });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: 'Request is already accepted or completed' 
      });
    }
    
    request.status = 'accepted';
    request.acceptedBy = donorName || donorId || 'Anonymous';
    await request.save();
    
    // Create alert for request creator
    const alert = new Alert({
      type: 'donor_accepted',
      title: 'Request Accepted',
      message: `${request.acceptedBy} has accepted your blood request`,
      relatedId: request._id.toString(),
      isRead: false
    });
    await alert.save();
    
    res.json({ 
      success: true, 
      request: request,
      message: 'Blood request accepted successfully' 
    });
  } catch (err) {
    console.error('Error accepting blood request:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to accept blood request' 
    });
  }
});

// PUT /api/blood-requests/:id - Update blood request (User or Admin)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      patientName, 
      age, 
      bloodGroup, 
      neededUnits,
      hospitalName,
      hospitalAddress,
      wardBedNumber,
      phone, 
      emergencyLevel,
      neededDate,
      neededTime,
      reasonNotes
    } = req.body;
    const userId = req.user?._id?.toString() || req.user?.userId || null;
    const isAdmin = req.user?.role === 'admin';
    
    const request = await BloodRequest.findById(id);
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        error: 'Blood request not found' 
      });
    }
    
    // Check if user owns the request or is admin
    if (!isAdmin && request.createdBy !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'You can only edit your own requests' 
      });
    }
    
    // Validate required fields
    if (!patientName || !age || !bloodGroup || !neededUnits || !hospitalName || !hospitalAddress || !phone || !neededDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    request.patientName = patientName.trim();
    request.age = parseInt(age) || 0;
    request.bloodGroup = bloodGroup;
    request.neededUnits = parseInt(neededUnits) || 1;
    request.hospitalName = hospitalName.trim();
    request.hospitalAddress = hospitalAddress.trim();
    request.wardBedNumber = wardBedNumber?.trim() || null;
    request.phone = phone.trim();
    request.emergencyLevel = emergencyLevel || 'normal';
    request.neededDate = new Date(neededDate);
    request.neededTime = neededTime || '12:00';
    request.reasonNotes = reasonNotes?.trim() || null;
    
    await request.save();
    
    res.json({ 
      success: true, 
      request: request,
      message: 'Blood request updated successfully' 
    });
  } catch (err) {
    console.error('Error updating blood request:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to update blood request' 
    });
  }
});

// PATCH /api/blood-requests/:id - Update blood request status (Admin)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['pending', 'accepted', 'completed'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status' 
      });
    }
    
    const request = await BloodRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        error: 'Blood request not found' 
      });
    }
    
    res.json({ 
      success: true, 
      request: request,
      message: 'Blood request updated successfully' 
    });
  } catch (err) {
    console.error('Error updating blood request:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to update blood request' 
    });
  }
});

// DELETE /api/blood-requests/:id - Delete blood request (User or Admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id?.toString() || req.user?.userId || null;
    const isAdmin = req.user?.role === 'admin';
    
    const request = await BloodRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        error: 'Blood request not found' 
      });
    }
    
    // Check if user owns the request or is admin
    if (!isAdmin && request.createdBy !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'You can only delete your own requests' 
      });
    }
    
    await BloodRequest.findByIdAndDelete(id);
    
    res.json({ 
      success: true, 
      message: 'Blood request deleted successfully' 
    });
  } catch (err) {
    console.error('Error deleting blood request:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to delete blood request' 
    });
  }
});

// GET /api/blood-requests/:id/match - Get matching donors for a request
router.get('/:id/match', async (req, res) => {
  try {
    const { id } = req.params;
    
    const request = await BloodRequest.findById(id);
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        error: 'Blood request not found' 
      });
    }
    
    // Find matching donors by blood group
    const matchingDonors = await Donor.find({ 
      bloodGroup: request.bloodGroup 
    })
      .sort({ lastDonation: 1 }) // Prioritize those who haven't donated recently
      .limit(10)
      .exec();
    
    res.json({ 
      success: true, 
      donors: matchingDonors,
      request: request 
    });
  } catch (err) {
    console.error('Error finding matching donors:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to find matching donors' 
    });
  }
});

module.exports = router;

