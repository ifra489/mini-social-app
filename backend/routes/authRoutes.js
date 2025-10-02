const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { jwtSecret, uploadsDir } = require('../config');

const router = express.Router();

// ------------------- Multer Config -------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ------------------- SIGNUP -------------------
router.post(
  '/signup',
  [
    body('username').isString().isLength({ min: 3 }).trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('bio').optional().isString().isLength({ max: 280 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      let { username, email, password, bio = '', profilePicture = '' } = req.body;

      username = username.toLowerCase();
      email = email.toLowerCase();

      const exists = await User.findOne({ $or: [{ username }, { email }] });
      if (exists) return res.status(409).json({ message: 'Username or email already exists' });

      const user = await User.create({ username, email, password, bio, profilePicture });

      const token = jwt.sign({ id: user._id, username: user.username }, jwtSecret, { expiresIn: '7d' });

      return res.status(201).json({
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          bio: user.bio,
          profilePicture: user.profilePicture,
        },
      });
    } catch (err) {
      console.error('Signup error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// ------------------- LOGIN -------------------
router.post(
  '/login',
  [body('identifier').isString(), body('password').isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { identifier, password } = req.body;
      const id = identifier.toLowerCase();

      const user = await User.findOne({ $or: [{ username: id }, { email: id }] });
      if (!user) return res.status(401).json({ message: 'Invalid credentials' });

      const ok = await user.comparePassword(password);
      if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

      const token = jwt.sign({ id: user._id, username: user.username }, jwtSecret, { expiresIn: '7d' });

      return res.json({
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          bio: user.bio,
          profilePicture: user.profilePicture,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// ------------------- LOGOUT -------------------
router.post('/logout', auth(), (req, res) => res.json({ message: 'Logged out' }));

// ------------------- GET ME -------------------
router.get('/me', auth(), async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select('-password');
    if (!me) return res.status(404).json({ message: 'User not found' });
    return res.json(me);
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ------------------- GET PROFILE -------------------
router.get('/profile/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() })
      .select('-password')
      .populate('followers', 'username profilePicture')
      .populate('following', 'username profilePicture');

    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json(user);
  } catch (err) {
    console.error('Profile error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ------------------- UPDATE SETTINGS -------------------
router.put(
  '/settings',
  auth(),
  upload.single('profilePicture'),
  [
    body('username').optional().isString().isLength({ min: 3, max: 30 }).trim().escape(),
    body('bio').optional().isString().isLength({ max: 280 }),
  ],
  async (req, res) => {
    try {
      const updates = {};

      // Username update
      if (req.body.username && req.body.username.toLowerCase() !== req.user.username) {
        const existingUser = await User.findOne({
          username: req.body.username.toLowerCase(),
          _id: { $ne: req.user.id },
        });
        if (existingUser) return res.status(409).json({ message: 'Username already taken' });
        updates.username = req.body.username.toLowerCase();
      }

      // Bio update
      if (req.body.bio !== undefined) updates.bio = req.body.bio;

      // Profile picture
      if (req.file) {
        updates.profilePicture = `/uploads/${req.file.filename}`;
      } else if (req.body.profilePicture) {
        updates.profilePicture = req.body.profilePicture;
      }

      const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
      if (!user) return res.status(404).json({ message: 'User not found' });

      return res.json(user);
    } catch (err) {
      console.error('Settings update error:', err);
      if (err.message === 'Only image files are allowed') {
        return res.status(400).json({ message: err.message });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
