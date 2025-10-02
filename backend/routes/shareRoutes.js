const express = require('express');
const { body, validationResult } = require('express-validator');
const Share = require('../models/Share');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

const router = express.Router();

// Get shares for a specific post
router.get('/', async (req, res) => {
  try {
    const { postId } = req.query;
    const query = postId ? { originalPost: postId } : {};
    const shares = await Share.find(query).sort({ createdAt: -1 }).populate('author', 'username').populate('originalPost');
    return res.json(shares);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Create a share (repost)
router.post('/', auth(), [
  body('postId').isString(),
  body('shareType').optional().isIn(['repost', 'link']),
  body('text').optional().isString().isLength({ max: 500 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  
  try {
    const { postId, shareType = 'repost', text = '' } = req.body;
    
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    // Check if user already shared this post
    const existingShare = await Share.findOne({ author: req.user.id, originalPost: postId });
    if (existingShare) {
      return res.status(400).json({ message: 'You have already shared this post' });
    }
    
    const share = await Share.create({
      author: req.user.id,
      originalPost: postId,
      shareType,
      text
    });
    
    const populatedShare = await Share.findById(share._id)
      .populate('author', 'username')
      .populate('originalPost');
    
    return res.status(201).json(populatedShare);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Delete a share
router.delete('/:id', auth(), async (req, res) => {
  try {
    const share = await Share.findOneAndDelete({ _id: req.params.id, author: req.user.id });
    if (!share) return res.status(404).json({ message: 'Share not found or not authorized' });
    return res.json({ message: 'Share deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get share count for a post
router.get('/count/:postId', async (req, res) => {
  try {
    const count = await Share.countDocuments({ originalPost: req.params.postId });
    return res.json({ count });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;





