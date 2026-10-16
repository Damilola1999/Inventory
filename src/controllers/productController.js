const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const ALLOWED_FIELDS = ['name', 'sku', 'description', 'category', 'price', 'stock', 'lowStockThreshold', 'isActive'];
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

exports.createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(pick(req.body, ALLOWED_FIELDS));
  res.status(201).json({ success: true, product });
});

exports.listProducts = asyncHandler(async (req, res) => {
  const { search, category, minPrice, maxPrice, inStock, page = 1, limit = 20, sort = '-createdAt' } = req.query;
  const filter = {};

  // Customers only see active products; staff/admin can see all via ?includeInactive=true
  const privileged = ['admin', 'staff'].includes(req.user.role);
  if (!(privileged && req.query.includeInactive === 'true')) filter.isActive = true;

  if (search) filter.$text = { $search: search };
  if (category) filter.category = category;
  if (inStock === 'true') filter.stock = { $gt: 0 };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const p = Math.max(Number(page), 1);
  const l = Math.min(Math.max(Number(limit), 1), 100);

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sort).skip((p - 1) * l).limit(l),
    Product.countDocuments(filter),
  ]);

  res.json({ success: true, total, page: p, pages: Math.ceil(total / l), products });
});

exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  const privileged = ['admin', 'staff'].includes(req.user.role);
  if (!product || (!product.isActive && !privileged)) throw new AppError('Product not found', 404);
  res.json({ success: true, product });
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, pick(req.body, ALLOWED_FIELDS), {
    new: true,
    runValidators: true,
  });
  if (!product) throw new AppError('Product not found', 404);
  res.json({ success: true, product });
});

// Soft delete so historical orders still reference a valid product
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!product) throw new AppError('Product not found', 404);
  res.json({ success: true, message: 'Product deactivated', product });
});

// Atomic stock adjustment: body { change: 10 } to add, { change: -3 } to remove
exports.adjustStock = asyncHandler(async (req, res) => {
  const change = Number(req.body.change);
  if (!Number.isInteger(change) || change === 0) throw new AppError('change must be a non-zero integer');

  const filter = { _id: req.params.id };
  if (change < 0) filter.stock = { $gte: -change }; // never go below zero

  const product = await Product.findOneAndUpdate(filter, { $inc: { stock: change } }, { new: true });
  if (!product) {
    const exists = await Product.exists({ _id: req.params.id });
    throw new AppError(exists ? 'Insufficient stock for this adjustment' : 'Product not found', exists ? 400 : 404);
  }
  res.json({ success: true, product });
});

exports.lowStock = asyncHandler(async (_req, res) => {
  const products = await Product.find({
    isActive: true,
    $expr: { $lte: ['$stock', '$lowStockThreshold'] },
  }).sort('stock');
  res.json({ success: true, count: products.length, products });
});
