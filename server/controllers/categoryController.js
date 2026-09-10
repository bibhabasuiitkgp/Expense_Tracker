const Category = require('../models/Category');

// Get all categories for user
exports.list = async (req, res, next) => {
  try {
    const categories = await Category.find({
      userId: req.user.id,
      isActive: true
    }).sort({ name: 1 }).lean();

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
