const express = require('express');
const User = require('../models/User');
const Follow = require('../models/Follow');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/:username', auth(), async (req, res) => {
  try {
    const target = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (String(target._id) === req.user.id) return res.status(400).json({ message: 'Cannot follow yourself' });

    const existing = await Follow.findOne({ followerId: req.user.id, followingId: target._id });
    if (existing) {
      await existing.deleteOne();
      await User.findByIdAndUpdate(req.user.id, { $pull: { following: target._id } });
      await User.findByIdAndUpdate(target._id, { $pull: { followers: req.user.id } });
      return res.json({ followed: false });
    }

    await Follow.create({ followerId: req.user.id, followingId: target._id });
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { following: target._id } });
    await User.findByIdAndUpdate(target._id, { $addToSet: { followers: req.user.id } });
    return res.json({ followed: true });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:username/followers', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() }).populate('followers', 'username');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user.followers);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:username/following', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() }).populate('following', 'username');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user.following);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;











