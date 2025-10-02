const express = require('express');
const { body, validationResult } = require('express-validator');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { postId } = req.query;
    const query = postId ? { postId } : {};
    const comments = await Comment.find(query)
      .sort({ createdAt: 1 })
      .populate('author', 'username profilePicture')
      .populate('replyTo', 'username')
      .populate('parentComment');
    return res.json(comments);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth(), [
  body('postId').isString(),
  body('text').isString().isLength({ min: 1, max: 500 }),
  body('parentComment').optional().isString(),
  body('replyTo').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const post = await Post.findById(req.body.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    const commentData = {
      author: req.user.id,
      postId: req.body.postId,
      text: req.body.text,
      parentComment: req.body.parentComment || null,
      replyTo: req.body.replyTo || null
    };
    
    const comment = await Comment.create(commentData);
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username profilePicture')
      .populate('replyTo', 'username')
      .populate('parentComment');
    return res.status(201).json(populatedComment);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth(), [body('text').isString().isLength({ min: 1, max: 500 })], async (req, res) => {
  try {
    const comment = await Comment.findOneAndUpdate({ _id: req.params.id, author: req.user.id }, { text: req.body.text }, { new: true });
    if (!comment) return res.status(404).json({ message: 'Comment not found or not authorized' });
    return res.json(comment);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth(), async (req, res) => {
  try {
    const comment = await Comment.findOneAndDelete({ _id: req.params.id, author: req.user.id });
    if (!comment) return res.status(404).json({ message: 'Comment not found or not authorized' });
    return res.json({ message: 'Comment deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;






