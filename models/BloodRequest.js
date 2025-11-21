const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema({
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  bloodGroup: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  neededDate: {
    type: Date,
    required: true
  },
  hospital: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'completed'],
    default: 'pending'
  },
  acceptedBy: {
    type: String,
    default: null
  },
  createdBy: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);

