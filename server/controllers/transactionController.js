const Transaction = require('../models/Transaction');
const { detectAnomaly } = require('../utils/anomalyDetection');
const mongoose = require('mongoose');

// Create a new transaction
exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body, userId: req.user.id };

    // Run anomaly detection
    if (data.type === 'expense' && data.category && data.amount) {
      const userId = new mongoose.Types.ObjectId(req.user.id);
      data.isAnomaly = await detectAnomaly(userId, data.category, data.amount);
    }

    const transaction = new Transaction(data);
    await transaction.save();

    res.status(201).json({ transaction });
  } catch (err) {
    next(err);
  }
};

// Get transactions with filters + pagination
exports.list = async (req, res, next) => {
  try {
    const {
      from, to, category, paymentMethod, q,
      page = 1, limit = 20, type, tags
    } = req.query;

    const filter = { userId: req.user.id };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (category) filter.category = category;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (type) filter.type = type;
    if (tags) filter.tags = { $in: tags.split(',') };
    if (q) {
      filter.$or = [
        { description: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Transaction.countDocuments(filter)
    ]);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get single transaction
exports.get = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).lean();

    if (!transaction) {
      return res.status(404).json({
        error: { message: 'Transaction not found.', code: 'NOT_FOUND' }
      });
    }

    res.json({ transaction });
  } catch (err) {
    next(err);
  }
};

// Update transaction
exports.update = async (req, res, next) => {
  try {
    const data = { ...req.body };
    delete data.userId; // prevent userId change

    // Re-run anomaly detection if amount or category changed
    if (data.type === 'expense' && (data.amount || data.category)) {
      const existing = await Transaction.findById(req.params.id);
      if (existing) {
        const amount = data.amount || existing.amount;
        const category = data.category || existing.category;
        const userId = new mongoose.Types.ObjectId(req.user.id);
        data.isAnomaly = await detectAnomaly(userId, category, amount);
      }
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      data,
      { new: true, runValidators: true }
    ).lean();

    if (!transaction) {
      return res.status(404).json({
        error: { message: 'Transaction not found.', code: 'NOT_FOUND' }
      });
    }

    res.json({ transaction });
  } catch (err) {
    next(err);
  }
};

// Delete transaction
exports.remove = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    }).lean();

    if (!transaction) {
      return res.status(404).json({
        error: { message: 'Transaction not found.', code: 'NOT_FOUND' }
      });
    }

    res.json({ transaction, message: 'Transaction deleted.' });
  } catch (err) {
    next(err);
  }
};
