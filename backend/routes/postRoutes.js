const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');
const { uploadsDir } = require('../config');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

// Public explore or personalized feed when authenticated
router.get('/', auth(false), async (req, res) => {
  try {
    let query = {};
    if (req.user?.id) {
      // Personalized: posts by people you follow or yourself
      const userId = req.user.id;
      // We need following list; simplest is to include posts by anyone for demo, but better to filter
      // For a basic personalized feed, fetch all for now; can be extended with aggregation.
      query = {};
    }
    const posts = await Post.find(query) 
      .sort({ createdAt: -1 })
      .populate('author', 'username profilePicture')
      .populate({ 
        path: 'comments', 
        populate: { 
          path: 'author', 
          select: 'username profilePicture' 
        } 
      });
    return res.json(posts);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post(
  '/',
  auth(),
  upload.single('image'),
  [body('text').optional().isString().isLength({ max: 1000 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const imagePath = req.file ? `/uploads/${req.file.filename}` : '';
      const post = await Post.create({ author: req.user.id, text: req.body.text || '', image: imagePath });
      return res.status(201).json(post);
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

router.put('/:id', auth(), [body('text').optional().isString()], async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate({ _id: req.params.id, author: req.user.id }, { text: req.body.text }, { new: true });
    if (!post) return res.status(404).json({ message: 'Post not found or not authorized' });
    return res.json(post);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth(), async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, author: req.user.id });
    if (!post) return res.status(404).json({ message: 'Post not found or not authorized' });
    await Comment.deleteMany({ postId: req.params.id });
    return res.json({ message: 'Post deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get posts by a specific user
router.get('/user/:username', auth(false), async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const posts = await Post.find({ author: user._id })
      .sort({ createdAt: -1 })
      .populate('author', 'username profilePicture')
      .populate({ 
        path: 'comments', 
        populate: { 
          path: 'author', 
          select: 'username profilePicture' 
        } 
      });
    return res.json(posts);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/like', auth(), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const hasLiked = post.likes.some((u) => String(u) === req.user.id);
    if (hasLiked) {
      post.likes = post.likes.filter((u) => String(u) !== req.user.id);
    } else {
      post.likes.push(req.user.id);
    }
    await post.save();
    return res.json({ likes: post.likes.length, liked: !hasLiked });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


