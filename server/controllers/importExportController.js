const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const csvParser = require('csv-parser');
const { Parser } = require('json2csv');
const { Readable } = require('stream');

// Export transactions as CSV
exports.exportCSV = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id })
      .sort({ date: -1 })
      .lean();

    const fields = ['date', 'amount', 'type', 'category', 'subcategory', 'paymentMethod', 'description', 'tags'];
    const parser = new Parser({ fields });
    const csv = parser.parse(transactions.map(t => ({
      ...t,
      date: new Date(t.date).toISOString().split('T')[0],
      tags: (t.tags || []).join('; ')
    })));

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

// Import CSV — parse, auto-categorize, return preview
exports.importCSV = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { message: 'No CSV file uploaded.', code: 'NO_FILE' }
      });
    }

    const categories = await Category.find({ userId: req.user.id }).lean();

    // Build keyword map from categories
    const keywordMap = {};
    categories.forEach(cat => {
      (cat.keywords || []).forEach(kw => {
        keywordMap[kw.toLowerCase()] = cat.name;
      });
      keywordMap[cat.name.toLowerCase()] = cat.name;
    });

    const rows = [];
    const stream = Readable.from(req.file.buffer.toString());

    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('data', (row) => {
          // Try to auto-categorize
          const description = (row.description || row.Description || row.narration || row.Narration || '').toLowerCase();
          const amount = parseFloat(row.amount || row.Amount || row.debit || row.Debit || 0);
          const date = row.date || row.Date || row['Transaction Date'] || row['Txn Date'] || '';

          let matchedCategory = null;
          let confidence = 'low';

          for (const [keyword, catName] of Object.entries(keywordMap)) {
            if (description.includes(keyword)) {
              matchedCategory = catName;
              confidence = 'high';
              break;
            }
          }

          rows.push({
            date: date,
            amount: Math.abs(amount),
            type: amount < 0 ? 'expense' : (row.type || 'expense'),
            category: matchedCategory || '',
            description: row.description || row.Description || row.narration || row.Narration || '',
            paymentMethod: row.paymentMethod || row['Payment Method'] || 'UPI',
            confidence,
            original: row
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    res.json({
      preview: rows,
      total: rows.length,
      categorized: rows.filter(r => r.confidence === 'high').length,
      uncategorized: rows.filter(r => r.confidence !== 'high').length
    });
  } catch (err) {
    next(err);
  }
};

// Confirm import — save the reviewed transactions
exports.confirmImport = async (req, res, next) => {
  try {
    const { transactions } = req.body;
    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({
        error: { message: 'transactions array is required.', code: 'VALIDATION_ERROR' }
      });
    }

    const docs = transactions.map(t => ({
      ...t,
      userId: req.user.id,
      date: new Date(t.date)
    }));

    const result = await Transaction.insertMany(docs);

    res.status(201).json({
      message: `${result.length} transactions imported.`,
      count: result.length
    });
  } catch (err) {
    next(err);
  }
};
