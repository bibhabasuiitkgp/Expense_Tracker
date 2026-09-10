const Transaction = require('../models/Transaction');

/**
 * Detect anomalous transactions.
 * A transaction is anomalous if its amount is > 2 standard deviations
 * above that category's trailing-90-day average.
 */
async function detectAnomaly(userId, category, amount) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const stats = await Transaction.aggregate([
    {
      $match: {
        userId: userId,
        category: category,
        type: 'expense',
        date: { $gte: ninetyDaysAgo }
      }
    },
    {
      $group: {
        _id: null,
        mean: { $avg: '$amount' },
        count: { $sum: 1 },
        amounts: { $push: '$amount' }
      }
    }
  ]);

  if (!stats.length || stats[0].count < 5) {
    // Not enough data to detect anomalies
    return false;
  }

  const { mean, amounts } = stats[0];

  // Calculate standard deviation
  const squaredDiffs = amounts.map(a => Math.pow(a - mean, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  // Flag if more than 2 standard deviations above mean
  return amount > mean + (2 * stdDev);
}

/**
 * Get all anomalous transactions for a user in a given month.
 */
async function getAnomalies(userId, month) {
  const startDate = new Date(`${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  return Transaction.find({
    userId,
    isAnomaly: true,
    date: { $gte: startDate, $lt: endDate }
  }).sort({ date: -1 }).lean();
}

module.exports = { detectAnomaly, getAnomalies };
