// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
};

// POST /api/auth/register - Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      role: 'user'
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toJSON();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Registration failed'
    });
  }
});

// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user has password (not Google-only account)
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'Please login with Google'
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toJSON();

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Login failed'
    });
  }
});

// POST /api/auth/google - Google OAuth login/signup
router.post('/google', async (req, res) => {
  try {
    const { googleId, email, name, avatar } = req.body;

    console.log('Google OAuth request:', { googleId, email, name, avatar: avatar ? 'present' : 'missing' });

    if (!googleId || !email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Google OAuth data. Please provide googleId, email, and name.'
      });
    }

    // Find or create user
    let user = await User.findOne({ 
      $or: [
        { googleId: googleId.toString() },
        { email: email.toLowerCase().trim() }
      ]
    });

    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId.toString();
      }
      // Update avatar if provided and not set
      if (avatar && !user.avatar) {
        user.avatar = avatar;
      }
      // Update name if changed
      if (name && user.name !== name) {
        user.name = name;
      }
      await user.save();
    } else {
      // Create new user
      try {
        user = new User({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          googleId: googleId.toString(),
          avatar: avatar || '',
          role: 'user',
          isVerified: true
        });
        await user.save();
        console.log('New Google user created:', user._id);
      } catch (createError) {
        // Handle duplicate email error
        if (createError.code === 11000) {
          // Email already exists, try to find and update
          user = await User.findOne({ email: email.toLowerCase().trim() });
          if (user) {
            user.googleId = googleId.toString();
            if (avatar) user.avatar = avatar;
            await user.save();
          } else {
            throw createError;
          }
        } else {
          throw createError;
        }
      }
    }

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toJSON();

    res.json({
      success: true,
      message: 'Google authentication successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Google authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user'
    });
  }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile'
    });
  }
});

module.exports = router;

