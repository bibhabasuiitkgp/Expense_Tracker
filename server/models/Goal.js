const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Goal name is required'],
    trim: true
  },
  targetAmount: {
    type: Number,
    required: [true, 'Target amount is required'],
    min: [0, 'Target must be positive']
  },
  targetDate: {
    type: Date,
    required: [true, 'Target date is required']
  },
  linkedCategory: {
    type: String,
    default: null
  },
  linkedInvestment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investment',
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

goalSchema.index({ userId: 1 });

module.exports = mongoose.model('Goal', goalSchema);
