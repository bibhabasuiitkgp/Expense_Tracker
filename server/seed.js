require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Transaction = require('./models/Transaction');
const Budget = require('./models/Budget');
const Investment = require('./models/Investment');
const Bucket = require('./models/Bucket');

async function seed() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Transaction.deleteMany({}),
      Budget.deleteMany({}),
      Investment.deleteMany({}),
      Bucket.deleteMany({})
    ]);
    console.log('🗑️  Cleared existing data');

    // Create user
    const user = new User({
      email: 'demo@expensetracker.app',
      password: 'demo123',
      name: 'Demo User'
    });
    await user.save();
    console.log('👤 Created demo user (demo@expensetracker.app / demo123)');

    // Create categories
    const categoriesData = [
      { name: 'Food', icon: '🍔', color: '#f97316', keywords: ['lunch', 'dinner', 'breakfast', 'snack', 'restaurant', 'zomato', 'swiggy', 'food', 'meal', 'cafe', 'pizza', 'burger', 'biryani', 'thali', 'chai', 'coffee', 'tea'], monthlyBudget: 8000 },
      { name: 'Transport', icon: '🚗', color: '#3b82f6', keywords: ['uber', 'ola', 'auto', 'rickshaw', 'petrol', 'fuel', 'diesel', 'metro', 'bus', 'cab', 'taxi', 'train', 'parking', 'toll'], monthlyBudget: 3000 },
      { name: 'Rent', icon: '🏠', color: '#8b5cf6', keywords: ['rent', 'house', 'apartment', 'flat', 'pg', 'hostel'], monthlyBudget: 15000 },
      { name: 'Utilities', icon: '💡', color: '#06b6d4', keywords: ['electricity', 'water', 'gas', 'internet', 'wifi', 'broadband', 'phone', 'mobile', 'recharge', 'bill'], monthlyBudget: 3000 },
      { name: 'Entertainment', icon: '🎬', color: '#ec4899', keywords: ['movie', 'netflix', 'prime', 'spotify', 'gaming', 'game', 'concert', 'show', 'theatre', 'book', 'subscription'], monthlyBudget: 2000 },
      { name: 'Shopping', icon: '🛍️', color: '#f43f5e', keywords: ['amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'gadget', 'electronics', 'appliance', 'furniture'], monthlyBudget: 5000 },
      { name: 'Health', icon: '🏥', color: '#10b981', keywords: ['medicine', 'doctor', 'hospital', 'pharmacy', 'gym', 'fitness', 'medical', 'health', 'lab', 'test', 'consultation'], monthlyBudget: 2000 },
      { name: 'Education', icon: '📚', color: '#6366f1', keywords: ['course', 'udemy', 'book', 'tuition', 'coaching', 'class', 'learning', 'exam', 'certification'], monthlyBudget: 3000 },
      { name: 'Subscriptions', icon: '📱', color: '#a855f7', keywords: ['subscription', 'plan', 'membership', 'premium'], monthlyBudget: 1500 },
      { name: 'Salary', icon: '💰', color: '#22c55e', keywords: ['salary', 'income', 'pay', 'bonus', 'stipend', 'freelance'], monthlyBudget: null }
    ];

    const categories = await Category.insertMany(
      categoriesData.map(c => ({ ...c, userId: user._id }))
    );
    console.log(`📂 Created ${categories.length} categories`);

    // Generate sample transactions (last 3 months)
    const now = new Date();
    const transactions = [];
    const paymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking'];

    const expenseCategories = categoriesData.filter(c => c.name !== 'Salary');

    // Generate ~50 transactions spread over 3 months
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);

      // Add salary income
      transactions.push({
        date: new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1),
        amount: 85000,
        type: 'income',
        category: 'Salary',
        paymentMethod: 'Net Banking',
        description: 'Monthly salary',
        tags: ['salary'],
        userId: user._id
      });

      // Add rent
      transactions.push({
        date: new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1),
        amount: 15000,
        type: 'expense',
        category: 'Rent',
        paymentMethod: 'Net Banking',
        description: 'Monthly apartment rent',
        tags: ['rent', 'fixed'],
        userId: user._id
      });

      // Generate random daily expenses
      const daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
      const maxDay = monthOffset === 0 ? Math.min(now.getDate(), daysInMonth) : daysInMonth;

      for (let day = 1; day <= maxDay; day++) {
        // 60% chance of having a transaction each day
        if (Math.random() < 0.6) {
          const cat = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
          const descriptions = {
            'Food': ['Lunch at office canteen', 'Dinner with friends', 'Swiggy order', 'Zomato delivery', 'Morning chai', 'Coffee at cafe', 'Weekend biryani', 'Grocery shopping'],
            'Transport': ['Uber to office', 'Ola ride', 'Metro card recharge', 'Auto rickshaw', 'Petrol fill-up', 'Parking charge'],
            'Utilities': ['Electricity bill', 'WiFi bill', 'Mobile recharge', 'Water bill', 'Gas cylinder'],
            'Entertainment': ['Netflix subscription', 'Movie tickets', 'Spotify premium', 'Book purchase', 'Gaming purchase'],
            'Shopping': ['Amazon order', 'New shoes', 'Clothes shopping', 'Flipkart order', 'Electronics purchase'],
            'Health': ['Gym membership', 'Medicine purchase', 'Doctor consultation', 'Lab test', 'Pharmacy'],
            'Education': ['Udemy course', 'Book purchase', 'Online certification', 'Tutorial subscription'],
            'Subscriptions': ['Netflix', 'Spotify', 'YouTube Premium', 'Cloud storage plan', 'App subscription']
          };

          const catDescs = descriptions[cat.name] || ['General expense'];
          const desc = catDescs[Math.floor(Math.random() * catDescs.length)];

          // Generate realistic amounts based on category
          const amountRanges = {
            'Food': [50, 800],
            'Transport': [30, 500],
            'Utilities': [200, 2500],
            'Entertainment': [100, 1500],
            'Shopping': [200, 5000],
            'Health': [100, 3000],
            'Education': [300, 5000],
            'Subscriptions': [100, 800]
          };

          const [min, max] = amountRanges[cat.name] || [50, 1000];
          const amount = Math.round(min + Math.random() * (max - min));

          transactions.push({
            date: new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day),
            amount,
            type: 'expense',
            category: cat.name,
            paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
            description: desc,
            tags: [],
            userId: user._id
          });
        }
      }
    }

    await Transaction.insertMany(transactions);
    console.log(`💳 Created ${transactions.length} sample transactions`);

    // Create budgets for current month
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const budgets = categoriesData
      .filter(c => c.monthlyBudget)
      .map(c => ({
        category: c.name,
        month: currentMonth,
        limit: c.monthlyBudget,
        userId: user._id
      }));

    await Budget.insertMany(budgets);
    console.log(`📊 Created ${budgets.length} budgets for ${currentMonth}`);

    // Create sample investments
    const investments = [
      {
        fundName: 'HDFC Flexi Cap Fund',
        folioNumber: 'HDFC-001',
        type: 'SIP',
        amountInvested: 50000,
        units: 450.5,
        NAVatPurchase: 111.0,
        purchaseDate: new Date(2025, 0, 15),
        currentNAV: 125.5,
        sipDate: 15,
        frequency: 'monthly',
        userId: user._id
      },
      {
        fundName: 'Axis Bluechip Fund',
        folioNumber: 'AXIS-002',
        type: 'SIP',
        amountInvested: 30000,
        units: 200.3,
        NAVatPurchase: 149.8,
        purchaseDate: new Date(2025, 2, 10),
        currentNAV: 162.4,
        sipDate: 10,
        frequency: 'monthly',
        userId: user._id
      },
      {
        fundName: 'Parag Parikh Flexi Cap Fund',
        folioNumber: 'PPFAS-003',
        type: 'lumpsum',
        amountInvested: 100000,
        units: 1500.0,
        NAVatPurchase: 66.67,
        purchaseDate: new Date(2024, 6, 1),
        currentNAV: 78.9,
        userId: user._id
      }
    ];

    await Investment.insertMany(investments);
    console.log(`📈 Created ${investments.length} sample investments`);

    console.log('\n✅ Seed complete!');
    console.log('   Login: demo@expensetracker.app / demo123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
