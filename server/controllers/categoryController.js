const Category = require('../models/Category');

const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: '🍔', color: '#f97316', keywords: ['lunch', 'dinner', 'breakfast', 'snack', 'restaurant', 'zomato', 'swiggy', 'food', 'meal', 'cafe', 'pizza', 'burger', 'biryani', 'thali', 'chai', 'coffee', 'tea'], monthlyBudget: 8000 },
  { name: 'Transport', icon: '🚗', color: '#3b82f6', keywords: ['uber', 'ola', 'auto', 'rickshaw', 'petrol', 'fuel', 'diesel', 'metro', 'bus', 'cab', 'taxi', 'train', 'parking', 'toll'], monthlyBudget: 3000 },
  { name: 'Rent', icon: '🏠', color: '#8b5cf6', keywords: ['rent', 'house', 'apartment', 'flat', 'pg', 'hostel'], monthlyBudget: 15000 },
  { name: 'Utilities', icon: '💡', color: '#06b6d4', keywords: ['electricity', 'water', 'gas', 'internet', 'wifi', 'broadband', 'phone', 'mobile', 'recharge', 'bill'], monthlyBudget: 3000 },
  { name: 'Entertainment', icon: '🎬', color: '#ec4899', keywords: ['movie', 'netflix', 'prime', 'spotify', 'gaming', 'game', 'concert', 'show', 'theatre', 'book', 'subscription'], monthlyBudget: 2000 },
  { name: 'Shopping', icon: '🛍️', color: '#f43f5e', keywords: ['amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'gadget', 'electronics', 'appliance', 'furniture'], monthlyBudget: 5000 },
  { name: 'Health', icon: '🏥', color: '#10b981', keywords: ['medicine', 'doctor', 'hospital', 'pharmacy', 'gym', 'fitness', 'medical', 'health', 'lab', 'test', 'consultation'], monthlyBudget: 2000 },
  { name: 'Education', icon: '📚', color: '#6366f1', keywords: ['course', 'udemy', 'book', 'tuition', 'coaching', 'class', 'learning', 'exam', 'certification'], monthlyBudget: 3000 },
  { name: 'Subscriptions', icon: '📱', color: '#a855f7', keywords: ['subscription', 'plan', 'membership', 'premium'], monthlyBudget: 1500 },
  { name: 'Investment', icon: '📈', color: '#10b981', keywords: ['investment', 'sip', 'mutual fund', 'stocks', 'emergency fund', 'fd', 'ppf'], monthlyBudget: null },
  { name: 'Salary', icon: '💰', color: '#22c55e', keywords: ['salary', 'income', 'pay', 'bonus', 'stipend', 'freelance'], monthlyBudget: null }
];

// Get all categories for user (auto-creates default categories if user has none)
exports.list = async (req, res, next) => {
  try {
    let categories = await Category.find({
      userId: req.user.id,
      isActive: true
    }).sort({ name: 1 }).lean();

    if (categories.length === 0) {
      await Category.insertMany(
        DEFAULT_CATEGORIES.map(c => ({ ...c, userId: req.user.id }))
      );
      categories = await Category.find({
        userId: req.user.id,
        isActive: true
      }).sort({ name: 1 }).lean();
    }

    res.json({ categories });
  } catch (err) {
    next(err);
  }
};

// Create category
exports.create = async (req, res, next) => {
  try {
    const category = new Category({
      ...req.body,
      userId: req.user.id
    });
    await category.save();
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
};

// Update category
exports.update = async (req, res, next) => {
  try {
    const data = { ...req.body };
    delete data.userId;

    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      data,
      { new: true, runValidators: true }
    ).lean();

    if (!category) {
      return res.status(404).json({
        error: { message: 'Category not found.', code: 'NOT_FOUND' }
      });
    }

    res.json({ category });
  } catch (err) {
    next(err);
  }
};

// Delete (soft-delete) category
exports.remove = async (req, res, next) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isActive: false },
      { new: true }
    ).lean();

    if (!category) {
      return res.status(404).json({
        error: { message: 'Category not found.', code: 'NOT_FOUND' }
      });
    }

    res.json({ category, message: 'Category deactivated.' });
  } catch (err) {
    next(err);
  }
};
