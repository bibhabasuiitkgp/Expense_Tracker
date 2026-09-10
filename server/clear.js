require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Transaction = require('./models/Transaction');
const Budget = require('./models/Budget');
const Investment = require('./models/Investment');
const Goal = require('./models/Goal');

async function clearDB() {
  try {
    console.log('🧹 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    const rl = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('⚠️  WARNING: This will permanently delete ALL data (Users, Transactions, Categories, etc.). Are you sure? (y/N): ', async (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('🗑️  Wiping database collections...');
        await Promise.all([
          User.deleteMany({}),
          Category.deleteMany({}),
          Transaction.deleteMany({}),
          Budget.deleteMany({}),
          Investment.deleteMany({}),
          Goal.deleteMany({})
        ]);
        console.log('✅ Database is now completely empty.');
      } else {
        console.log('🛑 Aborted.');
      }
      
      rl.close();
      process.exit(0);
    });
  } catch (err) {
    console.error('❌ Error clearing database:', err);
    process.exit(1);
  }
}

clearDB();
