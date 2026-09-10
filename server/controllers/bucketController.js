const Bucket = require('../models/Bucket');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

exports.getBuckets = async (req, res) => {
  try {
    const buckets = await Bucket.find({ user: req.user.id }).lean();
    
    // Calculate spent amount for each bucket directly from transactions
    const populatedBuckets = await Promise.all(buckets.map(async (bucket) => {
      const result = await Transaction.aggregate([
        { 
          $match: { 
            userId: new mongoose.Types.ObjectId(req.user.id),
            bucket: bucket._id,
            type: 'expense'
          } 
        },
        { 
          $group: { 
            _id: null, 
            totalSpent: { $sum: '$amount' } 
          } 
        }
      ]);

      const spent = result.length > 0 ? result[0].totalSpent : 0;
      const left = bucket.targetAmount - spent;
      const percentage = bucket.targetAmount > 0 ? Math.round((spent / bucket.targetAmount) * 100) : 0;

      return {
        ...bucket,
        spent,
        left,
        percentage
      };
    }));

    res.json({ buckets: populatedBuckets });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch buckets' });
  }
};

exports.createBucket = async (req, res) => {
  try {
    const { name, targetAmount, icon } = req.body;
    const bucket = new Bucket({
      user: req.user.id,
      name,
      targetAmount,
      icon: icon || '🪣'
    });
    
    await bucket.save();
    res.status(201).json({ bucket });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Bucket with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create bucket' });
  }
};

exports.updateBucket = async (req, res) => {
  try {
    const { name, targetAmount, icon } = req.body;
    const bucket = await Bucket.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { name, targetAmount, icon },
      { new: true, runValidators: true }
    );
    
    if (!bucket) {
      return res.status(404).json({ error: 'Bucket not found' });
    }
    
    res.json({ bucket });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Bucket with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to update bucket' });
  }
};

exports.deleteBucket = async (req, res) => {
  try {
    const bucket = await Bucket.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!bucket) {
      return res.status(404).json({ error: 'Bucket not found' });
    }
    
    // Optionally remove bucket reference from transactions
    await Transaction.updateMany(
      { userId: req.user.id, bucket: bucket._id },
      { $unset: { bucket: 1 } }
    );
    
    res.json({ message: 'Bucket deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bucket' });
  }
};
