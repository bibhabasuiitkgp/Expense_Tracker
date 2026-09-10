const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// Get budgets for a specific month with computed spent amounts
exports.list = async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        error: { message: 'month query parameter required in YYYY-MM format.', code: 'VALIDATION_ERROR' }
      });
    }

    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Get all budgets for this month
    const budgets = await Budget.find({
      userId: req.user.id,
      month: month
    }).lean();

    // Compute spent per category using aggregation
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const spentByCategory = await Transaction.aggregate([
      {
        $match: {
          userId: userId,
          type: 'expense',
          date: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: '$category',
          spent: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const spentMap = {};
    spentByCategory.forEach(s => {
      spentMap[s._id] = { spent: s.spent, count: s.count };
    });

    // Merge budgets with spent data
    const now = new Date();
    const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
    const daysPassed = month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      ? now.getDate()
      : daysInMonth;
    const daysLeft = daysInMonth - daysPassed;

    const result = budgets.map(b => {
      const spentData = spentMap[b.category] || { spent: 0, count: 0 };
      const remaining = b.limit - spentData.spent;
      const percentage = b.limit > 0 ? (spentData.spent / b.limit) * 100 : 0;
      const dailyBurnRate = daysPassed > 0 ? spentData.spent / daysPassed : 0;
      const projectedSpend = dailyBurnRate * daysInMonth;

      return {
        ...b,
        spent: Math.round(spentData.spent),
        transactionCount: spentData.count,
        remaining: Math.round(remaining),
        percentage: Math.round(percentage * 10) / 10,
        dailyBurnRate: Math.round(dailyBurnRate),
        projectedSpend: Math.round(projectedSpend),
        daysLeft,
        status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok'
      };
    });

    res.json({ budgets: result });
  } catch (err) {
    next(err);
  }
};

// Set or update a budget limit for a category
exports.upsert = async (req, res, next) => {
  try {
    const { category, month, limit } = req.body;

    const budget = await Budget.findOneAndUpdate(
      {
        userId: req.user.id,
        category: category,
        month: month
      },
      {
        userId: req.user.id,
        category: category,
        month: month,
        limit: limit
      },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    res.json({ budget });
  } catch (err) {
    next(err);
  }
};

// Delete a budget
exports.remove = async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    }).lean();

    if (!budget) {
      return res.status(404).json({
        error: { message: 'Budget not found.', code: 'NOT_FOUND' }
      });
    }

    res.json({ budget, message: 'Budget deleted.' });
  } catch (err) {
    next(err);
  }
};
