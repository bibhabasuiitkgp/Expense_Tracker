const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true
  },
  icon: {
    type: String,
    default: '📦'
  },
  color: {
    type: String,
    default: '#6366f1'
  },
  monthlyBudget: {
    type: Number,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  keywords: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

categorySchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
