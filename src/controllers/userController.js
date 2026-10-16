const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Admin: create staff/admin/customer accounts
exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) throw new AppError('name, email and password are required');
  const user = await User.create({ name, email, password, role });
  res.status(201).json({ success: true, user });
});

exports.listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  const users = await User.find(filter).sort('-createdAt');
  res.json({ success: true, count: users.length, users });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const { name, role, isActive } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);

  if (String(user._id) === String(req.user._id) && (role || isActive === false)) {
    throw new AppError('You cannot change your own role or disable yourself');
  }
  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  await user.save();

  res.json({ success: true, user });
});
