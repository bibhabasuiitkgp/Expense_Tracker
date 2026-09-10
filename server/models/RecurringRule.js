const mongoose = require('mongoose');

const recurringRuleSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  frequency: {
    type: String,
    enum: ['weekly', 'monthly', 'yearly'],
    required: [true, 'Frequency is required']
  },
  nextDueDate: {
    type: Date,
    required: [true, 'Next due date is required']
  },
  autoLog: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking'],
    default: 'UPI'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

recurringRuleSchema.index({ userId: 1 });
recurringRuleSchema.index({ nextDueDate: 1, autoLog: 1, isActive: 1 });

module.exports = mongoose.model('RecurringRule', recurringRuleSchema);
