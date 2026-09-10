const Transaction = require('../models/Transaction');

/**
 * Forecast month-end spend using a moving average + linear regression approach.
 * Returns projected total spend for the current month.
 */
async function forecastMonthSpend(userId) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // Get spending so far this month
  const currentSpend = await Transaction.aggregate([
    {
      $match: {
        userId,
        type: 'expense',
        date: { $gte: startOfMonth, $lte: now }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  const spentSoFar = currentSpend.length ? currentSpend[0].total : 0;

  // Get daily spending data for the last 3 months for moving average
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const monthlyTotals = await Transaction.aggregate([
    {
      $match: {
        userId,
        type: 'expense',
        date: { $gte: threeMonthsAgo, $lt: startOfMonth }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' }
        },
        total: { $sum: '$amount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Simple projection based on daily run rate this month
  const dailyRate = dayOfMonth > 0 ? spentSoFar / dayOfMonth : 0;
  const projectedByRate = dailyRate * daysInMonth;

  // Moving average of past months
  let movingAvg = 0;
  if (monthlyTotals.length > 0) {
    movingAvg = monthlyTotals.reduce((sum, m) => sum + m.total, 0) / monthlyTotals.length;
  }

  // Blend: weight current run rate more as month progresses
  const progressRatio = dayOfMonth / daysInMonth;
  const projected = progressRatio > 0.1
    ? (projectedByRate * progressRatio) + (movingAvg * (1 - progressRatio))
    : movingAvg || projectedByRate;

  return {
    currentMonth,
    spentSoFar: Math.round(spentSoFar),
    projected: Math.round(projected),
    dailyRate: Math.round(dailyRate),
    daysLeft: daysInMonth - dayOfMonth,
    movingAverage: Math.round(movingAvg)
  };
}

module.exports = { forecastMonthSpend };
