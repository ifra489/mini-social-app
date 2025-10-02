const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    text: { type: String, required: true, maxlength: 500 },
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }, // For replies
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // User being replied to
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);








