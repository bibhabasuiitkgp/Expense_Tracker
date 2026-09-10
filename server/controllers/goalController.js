const Goal = require('../models/Goal');
const Transaction = require('../models/Transaction');
const Investment = require('../models/Investment');
const mongoose = require('mongoose');

// List all goals with computed progress
exports.list = async (req, res, next) => {
  try {
    const goals = await Goal.find({ userId: req.user.id }).lean();
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const result = await Promise.all(goals.map(async (goal) => {
      let currentProgress = 0;

      // If linked to a category, sum income in that category
      if (goal.linkedCategory) {
        const catIncome = await Transaction.aggregate([
          {
            $match: {
              userId,
              type: 'income',
              category: goal.linkedCategory
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        currentProgress = catIncome.length ? catIncome[0].total : 0;
      }

      // If linked to an investment, use current value
      if (goal.linkedInvestment) {
        const inv = await Investment.findById(goal.linkedInvestment);
        if (inv) {
          currentProgress = inv.currentNAV ? inv.units * inv.currentNAV : inv.amountInvested;
        }
      }

      const percentage = goal.targetAmount > 0
        ? Math.round((currentProgress / goal.targetAmount) * 1000) / 10
        : 0;

      const daysLeft = Math.max(0, Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24)));

      return {
        ...goal,
        currentProgress: Math.round(currentProgress),
        percentage,
        daysLeft
      };
    }));

    res.json({ goals: result });
  } catch (err) {
    next(err);
  }
};

// Create goal
exports.create = async (req, res, next) => {
  try {
    const goal = new Goal({
      ...req.body,
      userId: req.user.id
    });
    await goal.save();
    res.status(201).json({ goal });
  } catch (err) {
    next(err);
  }
};

// Update goal
exports.update = async (req, res, next) => {
  try {
    const data = { ...req.body };
    delete data.userId;

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      data,
      { new: true, runValidators: true }
    ).lean();

    if (!goal) {
      return res.status(404).json({
        error: { message: 'Goal not found.', code: 'NOT_FOUND' }
      });
    }

    res.json({ goal });
  } catch (err) {
    next(err);
  }
};

// Delete goal
exports.remove = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    }).lean();

    if (!goal) {
      return res.status(404).json({
        error: { message: 'Goal not found.', code: 'NOT_FOUND' }
      });
    }

    res.json({ goal, message: 'Goal deleted.' });
  } catch (err) {
    next(err);
  }
};
