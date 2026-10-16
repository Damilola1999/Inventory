const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');

// Public: customers only. Role can never be set from here.
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) throw new AppError('name, email and password are required');

  const user = await User.create({ name, email, password, role: 'customer' });
  res.status(201).json({ success: true, token: signToken(user), user });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('email and password are required');

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw new AppError('Invalid credentials', 401);
  if (!user.isActive) throw new AppError('Account disabled', 403);

  res.json({ success: true, token: signToken(user), user });
});

exports.me = (req, res) => res.json({ success: true, user: req.user });
