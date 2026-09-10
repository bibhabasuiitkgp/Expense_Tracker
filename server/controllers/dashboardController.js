const Transaction = require('../models/Transaction');
const { getAnomalies } = require('../utils/anomalyDetection');
const { forecastMonthSpend } = require('../utils/forecast');
const mongoose = require('mongoose');

// Dashboard summary for a specific month
exports.summary = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const prevStartDate = new Date(startDate);
    prevStartDate.setMonth(prevStartDate.getMonth() - 1);

    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Parallel aggregation queries
    const [
      currentMonth,
      previousMonth,
      categoryBreakdown,
      dailySpend,
      anomalies,
      forecast,
      streak,
      incomeThisMonth,
      investmentsThisMonth
    ] = await Promise.all([
      // Total spend this month
      Transaction.aggregate([
        { $match: { userId, type: 'expense', date: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),

      // Total spend last month
      Transaction.aggregate([
        { $match: { userId, type: 'expense', date: { $gte: prevStartDate, $lt: startDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // Category breakdown
      Transaction.aggregate([
        { $match: { userId, type: 'expense', date: { $gte: startDate, $lt: endDate } } },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } }
      ]),

      // Daily spend for heatmap
      Transaction.aggregate([
        { $match: { userId, type: 'expense', date: { $gte: startDate, $lt: endDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            total: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Anomalies
      getAnomalies(userId, month),

      // Forecast
      forecastMonthSpend(userId),

      // Logging streak — count consecutive days with at least one transaction
      calculateStreak(userId),

      // Income this month
      Transaction.aggregate([
        { $match: { userId, type: 'income', date: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // Investment Outflow this month
      Transaction.aggregate([
        { $match: { userId, type: 'expense', category: 'Investment', date: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const currentTotal = currentMonth.length ? currentMonth[0].total : 0;
    const previousTotal = previousMonth.length ? previousMonth[0].total : 0;
    const transactionCount = currentMonth.length ? currentMonth[0].count : 0;
    const incomeTotal = incomeThisMonth.length ? incomeThisMonth[0].total : 0;
    const investmentOutflow = investmentsThisMonth.length ? investmentsThisMonth[0].total : 0;

    const percentChange = previousTotal > 0
      ? Math.round(((currentTotal - previousTotal) / previousTotal) * 1000) / 10
      : 0;

    res.json({
      month,
      totalSpend: Math.round(currentTotal),
      previousMonthSpend: Math.round(previousTotal),
      percentChange,
      transactionCount,
      totalIncome: Math.round(incomeTotal),
      netSavings: Math.round(incomeTotal - currentTotal),
      investmentOutflow: Math.round(investmentOutflow),
      categoryBreakdown,
      dailySpend,
      anomalies,
      forecast,
      streak
    });
  } catch (err) {
    next(err);
  }
};

// Monthly trend data
exports.trend = async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const trend = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Reshape into monthly entries
    const monthlyData = {};
    trend.forEach(t => {
      const key = `${t._id.year}-${String(t._id.month).padStart(2, '0')}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { month: key, expense: 0, income: 0 };
      }
      monthlyData[key][t._id.type] = Math.round(t.total);
    });

    res.json({
      trend: Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))
    });
  } catch (err) {
    next(err);
  }
};

// Helper: calculate logging streak
async function calculateStreak(userId) {
  const now = new Date();
  let streak = 0;
  let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Check up to 365 days back
  for (let i = 0; i < 365; i++) {
    const dayStart = new Date(checkDate);
    const dayEnd = new Date(checkDate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const count = await Transaction.countDocuments({
      userId,
      createdAt: { $gte: dayStart, $lt: dayEnd }
    });

    if (count > 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
