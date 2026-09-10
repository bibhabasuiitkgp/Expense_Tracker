const Investment = require('../models/Investment');
const Transaction = require('../models/Transaction');
const { xirr } = require('../utils/xirr');
const mongoose = require('mongoose');

const INVESTMENT_CATEGORY = 'Investment';

// Helper: create a linked expense transaction for an investment action
async function createLinkedTransaction(userId, amount, date, description) {
  const transaction = new Transaction({
    date: new Date(date),
    amount,
    type: 'expense',
    category: INVESTMENT_CATEGORY,
    description,
    paymentMethod: 'Net Banking',
    tags: ['auto-investment'],
    userId
  });
  await transaction.save();
  return transaction;
}

// Helper: build description string for investment transactions
function buildDescription(type, fundName, isContribution = false) {
  const typeLabel = type === 'emergency_fund' ? 'Emergency Fund' : type;
  if (isContribution) {
    return `${typeLabel} contribution: ${fundName}`;
  }
  return `${typeLabel}: ${fundName}`;
}

// List all investments
exports.list = async (req, res, next) => {
  try {
    const investments = await Investment.find({ userId: req.user.id })
      .sort({ purchaseDate: -1 })
      .lean();

    // Attach virtuals manually for lean queries
    const result = investments.map(inv => {
      const isEmergency = inv.type === 'emergency_fund';
      const currentValue = isEmergency
        ? inv.amountInvested
        : (inv.currentNAV ? inv.units * inv.currentNAV : inv.amountInvested);
      const gainLoss = isEmergency ? 0 : (currentValue - inv.amountInvested);

      return {
        ...inv,
        currentValue,
        gainLoss,
        gainLossPercent: (!isEmergency && inv.amountInvested > 0)
          ? Math.round((gainLoss / inv.amountInvested) * 10000) / 100
          : 0,
        totalContributions: (inv.contributions || []).reduce((s, c) => s + c.amount, 0)
      };
    });

    res.json({ investments: result });
  } catch (err) {
    next(err);
  }
};

// Create investment (+ auto-create linked expense transaction)
exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body, userId: req.user.id };

    // For emergency funds, set defaults for fields that don't apply
    if (data.type === 'emergency_fund') {
      data.units = data.units || null;
      data.NAVatPurchase = data.NAVatPurchase || null;
      data.currentNAV = null;
    }

    // Create the linked expense transaction
    const description = buildDescription(data.type, data.fundName);
    const linkedTxn = await createLinkedTransaction(
      req.user.id,
      data.amountInvested,
      data.purchaseDate,
      description
    );

    data.linkedTransactionId = linkedTxn._id;

    const investment = new Investment(data);
    await investment.save();

    res.status(201).json({ investment, linkedTransaction: linkedTxn });
  } catch (err) {
    next(err);
  }
};

// Add contribution (for emergency_fund and SIP top-ups)
exports.addContribution = async (req, res, next) => {
  try {
    const { amount, date, note } = req.body;

    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!investment) {
      return res.status(404).json({
        error: { message: 'Investment not found.', code: 'NOT_FOUND' }
      });
    }

    // Create linked expense transaction for this contribution
    const description = buildDescription(investment.type, investment.fundName, true);
    const linkedTxn = await createLinkedTransaction(
      req.user.id,
      amount,
      date || new Date(),
      description
    );

    // Push contribution
    investment.contributions.push({
      amount,
      date: new Date(date || Date.now()),
      transactionId: linkedTxn._id,
      note: note || ''
    });

    // Update total invested
    investment.amountInvested += amount;

    await investment.save();

    res.status(201).json({
      investment,
      contribution: investment.contributions[investment.contributions.length - 1],
      linkedTransaction: linkedTxn
    });
  } catch (err) {
    next(err);
  }
};

// Get contributions for an investment
exports.getContributions = async (req, res, next) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).lean();

    if (!investment) {
      return res.status(404).json({
        error: { message: 'Investment not found.', code: 'NOT_FOUND' }
      });
    }

    res.json({
      fundName: investment.fundName,
      type: investment.type,
      contributions: investment.contributions || [],
      totalContributions: (investment.contributions || []).reduce((s, c) => s + c.amount, 0)
    });
  } catch (err) {
    next(err);
  }
};

// Update investment
exports.update = async (req, res, next) => {
  try {
    const data = { ...req.body };
    delete data.userId;
    // Don't allow changing contributions or linked txns via update
    delete data.contributions;
    delete data.linkedTransactionId;

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

// Delete investment (+ delete all linked transactions)
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

    // Collect all linked transaction IDs to delete
    const txnIds = [];
    if (investment.linkedTransactionId) {
      txnIds.push(investment.linkedTransactionId);
    }
    if (investment.contributions && investment.contributions.length > 0) {
      investment.contributions.forEach(c => {
        if (c.transactionId) txnIds.push(c.transactionId);
      });
    }

    // Delete all linked transactions
    if (txnIds.length > 0) {
      await Transaction.deleteMany({ _id: { $in: txnIds } });
    }

    res.json({
      investment,
      message: 'Investment and linked transactions deleted.',
      deletedTransactions: txnIds.length
    });
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
    let emergencyFundTotal = 0;
    let emergencyFundTarget = 0;
    const fundSummaries = [];

    for (const inv of investments) {
      const isEmergency = inv.type === 'emergency_fund';
      const currentValue = isEmergency
        ? inv.amountInvested
        : (inv.currentNAV ? inv.units * inv.currentNAV : inv.amountInvested);

      totalInvested += inv.amountInvested;
      totalCurrentValue += currentValue;

      if (isEmergency) {
        emergencyFundTotal += inv.amountInvested;
        emergencyFundTarget += inv.targetAmount || 0;
      }

      // Calculate XIRR per fund (skip for emergency funds with no growth)
      let fundXirr = 0;
      if (!isEmergency) {
        const cashflows = [
          { amount: -inv.amountInvested, date: inv.purchaseDate },
          { amount: currentValue, date: new Date() }
        ];
        fundXirr = xirr(cashflows);
      }

      fundSummaries.push({
        _id: inv._id,
        fundName: inv.fundName,
        type: inv.type,
        amountInvested: inv.amountInvested,
        currentValue: Math.round(currentValue),
        gainLoss: Math.round(currentValue - inv.amountInvested),
        gainLossPercent: (!isEmergency && inv.amountInvested > 0)
          ? Math.round(((currentValue - inv.amountInvested) / inv.amountInvested) * 10000) / 100
          : 0,
        xirr: Math.round(fundXirr * 10000) / 100,
        targetAmount: inv.targetAmount || null,
        contributionCount: (inv.contributions || []).length
      });
    }

    // Portfolio XIRR (exclude emergency funds)
    const nonEmergency = investments.filter(i => i.type !== 'emergency_fund');
    const allCashflows = nonEmergency.flatMap(inv => {
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
      emergencyFund: {
        total: Math.round(emergencyFundTotal),
        target: Math.round(emergencyFundTarget),
        progress: emergencyFundTarget > 0
          ? Math.round((emergencyFundTotal / emergencyFundTarget) * 100)
          : 0
      },
      funds: fundSummaries
    });
  } catch (err) {
    next(err);
  }
};
