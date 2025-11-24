// backend/models/Donor.js
const mongoose = require('mongoose');

const DonorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  bloodGroup: { type: String, required: true },
  gender: { type: String, required: true },
  district: { type: String, required: true },
  upazila: { type: String, required: true },
  area: { type: String, required: true },
  address: { type: String }, // ✅ এইটা required না
  medicalConditions: { type: String, required: true },
  phone: { type: Number }, // Optional now
  email: { type: String }, // User email for linking
  visibility: { type: String, enum: ['only_me', 'public'], default: 'public' }, // Visibility setting
  userId: { type: String }, // Link to User model
  dob: { type: Date, required: true },
  lastDonation: { type: Date, required: true },
  donationsCount: { type: Number, required: true, default: 0 },
  avatar: { type: String, default: '', required: false }, // path to uploaded file (e.g. "/uploads/123.jpg")
  isAvailable: { type: Boolean, default: false }, // Manual availability toggle
  isBlocked: { type: Boolean, default: false }, // Block spammer flag
  blockedAt: { type: Date }, // When the donor was blocked
  blockedBy: { type: String }, // Admin user ID who blocked
  createdAt: { type: Date, default: Date.now }
});

// Virtual field to calculate availability based on last donation
DonorSchema.virtual('calculatedAvailability').get(function() {
  if (!this.lastDonation) return false;
  
  const today = new Date();
  const lastDonation = new Date(this.lastDonation);
  const diffDays = Math.floor((today - lastDonation) / (1000 * 60 * 60 * 24));
  
  // Male: 90 days, Female: 180 days
  const minDays = this.gender?.toLowerCase() === 'female' ? 180 : 90;
  return diffDays >= minDays;
});

// Method to get actual availability (manual override or calculated)
DonorSchema.methods.getAvailability = function() {
  // If manually set, use that; otherwise calculate
  if (this.isAvailable !== undefined && this.isAvailable !== null) {
    return this.isAvailable;
  }
  return this.calculatedAvailability;
};

DonorSchema.set('toJSON', { virtuals: true });
DonorSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Donor', DonorSchema);
