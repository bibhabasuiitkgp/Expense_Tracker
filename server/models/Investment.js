const mongoose = require('mongoose');

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
    enum: ['SIP', 'lumpsum'],
    required: [true, 'Investment type is required']
  },
  amountInvested: {
    type: Number,
    required: [true, 'Amount invested is required'],
    min: [0, 'Amount must be positive']
  },
  units: {
    type: Number,
    required: [true, 'Units are required'],
    min: [0, 'Units must be positive']
  },
  NAVatPurchase: {
    type: Number,
    required: [true, 'NAV at purchase is required'],
    min: [0, 'NAV must be positive']
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
  if (this.currentNAV && this.units) {
    return this.units * this.currentNAV;
  }
  return this.amountInvested;
});

// Virtual for gain/loss
investmentSchema.virtual('gainLoss').get(function() {
  const currentVal = this.currentNAV ? this.units * this.currentNAV : this.amountInvested;
  return currentVal - this.amountInvested;
});

investmentSchema.set('toJSON', { virtuals: true });
investmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Investment', investmentSchema);
