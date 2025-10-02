const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    shareType: { type: String, enum: ['repost', 'link'], default: 'repost' },
    text: { type: String, default: '', maxlength: 500 }, // Optional text when sharing
  },
  { timestamps: true }
);

module.exports = mongoose.model('Share', shareSchema);





