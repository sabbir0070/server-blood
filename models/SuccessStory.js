// backend/models/SuccessStory.js
const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String },
  userAvatar: { type: String },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SuccessStorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  story: { type: String, required: true },
  bloodGroup: { type: String },
  rating: { type: Number, default: 5, min: 1, max: 5 },
  userId: { type: String, required: true }, // user ID from User model
  userName: { type: String },
  userPhone: { type: String },
  userEmail: { type: String },
  userAvatar: { type: String },
  reactions: {
    like: [{ type: String }], // Array of user IDs
    love: [{ type: String }],
    wow: [{ type: String }],
    sad: [{ type: String }],
    angry: [{ type: String }]
  },
  comments: [CommentSchema],
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update updatedAt before saving
SuccessStorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('SuccessStory', SuccessStorySchema);

