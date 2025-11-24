const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema({
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 1,
    max: 150
  },
  bloodGroup: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  neededUnits: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  hospitalName: {
    type: String,
    required: true,
    trim: true
  },
  hospitalAddress: {
    type: String,
    required: true,
    trim: true
  },
  wardBedNumber: {
    type: String,
    trim: true,
    default: null
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  emergencyLevel: {
    type: String,
    enum: ['normal', 'urgent', 'critical'],
    default: 'normal'
  },
  neededDate: {
    type: Date,
    required: true
  },
  neededTime: {
    type: String,
    default: '12:00'
  },
  reasonNotes: {
    type: String,
    trim: true,
    default: null
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

