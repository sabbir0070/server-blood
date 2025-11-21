const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');

// GET /api/alerts - Get all alerts
router.get('/', async (req, res) => {
  try {
    const { userId, type, isRead } = req.query;
    const filter = {};
    
    if (userId) filter.userId = userId;
    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    
    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .exec();
    
    res.json({ 
      success: true, 
      alerts: alerts 
    });
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to fetch alerts' 
    });
  }
});

// PATCH /api/alerts/:id/read - Mark alert as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    const alert = await Alert.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );
    
    if (!alert) {
      return res.status(404).json({ 
        success: false, 
        error: 'Alert not found' 
      });
    }
    
    res.json({ 
      success: true, 
      alert: alert,
      message: 'Alert marked as read' 
    });
  } catch (err) {
    console.error('Error marking alert as read:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to mark alert as read' 
    });
  }
});

// PATCH /api/alerts/read-all - Mark all alerts as read
router.patch('/read-all', async (req, res) => {
  try {
    const { userId } = req.body;
    const filter = { isRead: false };
    
    if (userId) filter.userId = userId;
    
    const result = await Alert.updateMany(filter, { isRead: true });
    
    res.json({ 
      success: true, 
      updated: result.modifiedCount,
      message: 'All alerts marked as read' 
    });
  } catch (err) {
    console.error('Error marking all alerts as read:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to mark all alerts as read' 
    });
  }
});

module.exports = router;

