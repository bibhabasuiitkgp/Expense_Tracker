const mongoose = require('mongoose');

const bucketSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 0
  },
  icon: {
    type: String,
    default: '🪣'
  }
}, { timestamps: true });

// Ensure unique bucket names per user
bucketSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Bucket', bucketSchema);
