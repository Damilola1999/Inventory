require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  await connectDB();
  const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  if (await User.findOne({ email })) {
    console.log(`Admin already exists: ${email}`);
  } else {
    await User.create({
      name: process.env.ADMIN_NAME || 'Super Admin',
      email,
      password: process.env.ADMIN_PASSWORD || 'Admin12345',
      role: 'admin',
    });
    console.log(`Admin created: ${email}`);
  }
  await mongoose.disconnect();
})();
