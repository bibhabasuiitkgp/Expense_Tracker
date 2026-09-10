const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Contribution must be positive']
  },
  date: {
    type: Date,
    required: true
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null
  },
  note: {
    type: String,
    default: ''
  }
}, { _id: true, timestamps: false });

const investmentSchema = new mongoose.Schema({
  fundName: {
    type: String,
    required: [true, 'Fund name is required'],
    trim: true
  },
  folioNumber: {
    type: String,
    trim: true,
    default: ''
  },
  type: {
    type: String,
    enum: ['SIP', 'lumpsum', 'emergency_fund'],
    required: [true, 'Investment type is required']
  },
  amountInvested: {
    type: Number,
    required: [true, 'Amount invested is required'],
    min: [0, 'Amount must be positive']
  },
  units: {
    type: Number,
    min: [0, 'Units must be positive'],
    default: null
  },
  NAVatPurchase: {
    type: Number,
    min: [0, 'NAV must be positive'],
    default: null
  },
  purchaseDate: {
    type: Date,
    required: [true, 'Purchase date is required']
  },
  currentNAV: {
    type: Number,
    default: null
  },
  sipDate: {
    type: Number,
    min: 1,
    max: 31,
    default: null
  },
  frequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly', null],
    default: null
  },
  // Emergency fund target
  targetAmount: {
    type: Number,
    min: [0, 'Target must be positive'],
    default: null
  },
  // Linked expense transaction for the initial purchase
  linkedTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null
  },
  // Contribution history (for emergency_fund and SIP top-ups)
  contributions: [contributionSchema],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

investmentSchema.index({ userId: 1 });

// Virtual for current value
investmentSchema.virtual('currentValue').get(function() {
  if (this.type === 'emergency_fund') {
    // Emergency fund value = total deposited (initial + contributions)
    return this.amountInvested;
  }
  if (this.currentNAV && this.units) {
    return this.units * this.currentNAV;
  }
  return this.amountInvested;
});

// Virtual for gain/loss
investmentSchema.virtual('gainLoss').get(function() {
  if (this.type === 'emergency_fund') {
    return 0; // Emergency funds don't have gain/loss
  }
  const currentVal = this.currentNAV ? this.units * this.currentNAV : this.amountInvested;
  return currentVal - this.amountInvested;
});

// Virtual for total contributions amount
investmentSchema.virtual('totalContributions').get(function() {
  if (!this.contributions || this.contributions.length === 0) return 0;
  return this.contributions.reduce((sum, c) => sum + c.amount, 0);
});

investmentSchema.set('toJSON', { virtuals: true });
investmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Investment', investmentSchema);
