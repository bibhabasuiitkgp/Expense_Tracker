const Investment = require('../models/Investment');
const Transaction = require('../models/Transaction');
const { xirr } = require('../utils/xirr');
const mongoose = require('mongoose');

// List all investments
exports.list = async (req, res, next) => {
  try {
    const investments = await Investment.find({ userId: req.user.id })
      .sort({ purchaseDate: -1 })
      .lean();

    // Attach virtuals manually for lean queries
    const result = investments.map(inv => ({
      ...inv,
      currentValue: inv.currentNAV ? inv.units * inv.currentNAV : inv.amountInvested,
      gainLoss: inv.currentNAV ? (inv.units * inv.currentNAV) - inv.amountInvested : 0,
      gainLossPercent: inv.currentNAV
        ? Math.round(((inv.units * inv.currentNAV - inv.amountInvested) / inv.amountInvested) * 10000) / 100
        : 0
    }));

    res.json({ investments: result });
  } catch (err) {
    next(err);
  }
};

// Create investment
exports.create = async (req, res, next) => {
  try {
    const investment = new Investment({
      ...req.body,
      userId: req.user.id
    });
    await investment.save();
    res.status(201).json({ investment });
  } catch (err) {
    next(err);
  }
};

// Update investment
exports.update = async (req, res, next) => {
  try {
    const data = { ...req.body };
    delete data.userId;

    const investment = await Investment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      data,
      { new: true, runValidators: true }
    );

    if (!investment) {
      return res.status(404).json({
        error: { message: 'Investment not found.', code: 'NOT_FOUND' }
      });
    }

    res.json({ investment });
  } catch (err) {
    next(err);
  }
};

// Delete investment
exports.remove = async (req, res, next) => {
  try {
    const investment = await Investment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!investment) {
      return res.status(404).json({
        error: { message: 'Investment not found.', code: 'NOT_FOUND' }
      });
    }

    res.json({ investment, message: 'Investment deleted.' });
  } catch (err) {
    next(err);
  }
};

// Investment summary: XIRR, current value, net worth
exports.summary = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const investments = await Investment.find({ userId: req.user.id }).lean();

    let totalInvested = 0;
    let totalCurrentValue = 0;
    const fundSummaries = [];

    for (const inv of investments) {
      const currentValue = inv.currentNAV ? inv.units * inv.currentNAV : inv.amountInvested;
      totalInvested += inv.amountInvested;
      totalCurrentValue += currentValue;

      // Calculate XIRR per fund
      const cashflows = [
        { amount: -inv.amountInvested, date: inv.purchaseDate },
        { amount: currentValue, date: new Date() }
      ];
      const fundXirr = xirr(cashflows);

      fundSummaries.push({
        _id: inv._id,
        fundName: inv.fundName,
        type: inv.type,
        amountInvested: inv.amountInvested,
        currentValue: Math.round(currentValue),
        gainLoss: Math.round(currentValue - inv.amountInvested),
        gainLossPercent: Math.round(((currentValue - inv.amountInvested) / inv.amountInvested) * 10000) / 100,
        xirr: Math.round(fundXirr * 10000) / 100 // as percentage
      });
    }

    // Portfolio XIRR
    const allCashflows = investments.flatMap(inv => {
      const currentValue = inv.currentNAV ? inv.units * inv.currentNAV : inv.amountInvested;
      return [
        { amount: -inv.amountInvested, date: inv.purchaseDate },
        { amount: currentValue, date: new Date() }
      ];
    });
    const portfolioXirr = allCashflows.length >= 2 ? xirr(allCashflows) : 0;

    // Net worth: compute from income - expense + investment value
    const incomeExpense = await Transaction.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    incomeExpense.forEach(ie => {
      if (ie._id === 'income') totalIncome = ie.total;
      if (ie._id === 'expense') totalExpense = ie.total;
    });

    const liquidCash = totalIncome - totalExpense;
    const netWorth = liquidCash + totalCurrentValue;

    res.json({
      totalInvested: Math.round(totalInvested),
      totalCurrentValue: Math.round(totalCurrentValue),
      totalGainLoss: Math.round(totalCurrentValue - totalInvested),
      portfolioXirr: Math.round(portfolioXirr * 10000) / 100,
      liquidCash: Math.round(liquidCash),
      netWorth: Math.round(netWorth),
      funds: fundSummaries
    });
  } catch (err) {
    next(err);
  }
};
