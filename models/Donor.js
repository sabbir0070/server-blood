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
  phone: { type: Number, required: true },
  dob: { type: Date, required: true },
  lastDonation: { type: Date, required: true },
  donationsCount: { type: Number, required: true, default: 0 },
  avatar: { type: String, required: true }, // path to uploaded file (e.g. "/uploads/123.jpg")
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Donor', DonorSchema);
