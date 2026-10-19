const Order = require('../models/Order');
const Product = require('../models/Product');
const { STATUSES } = require('../models/Order');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Allowed status transitions
const TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

// Put stock back (used on cancellation and failed order creation)
const restock = (items) =>
  Promise.all(items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.quantity } })));

// Customer: place an order. Stock is reserved atomically per item.
exports.createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress } = req.body;
  if (!Array.isArray(items) || items.length === 0) throw new AppError('items must be a non-empty array');
  if (!shippingAddress?.line1 || !shippingAddress?.city) throw new AppError('shippingAddress.line1 and city are required');

  // Idempotency: a retried request (e.g. after a dropped connection) must not create a second order
  const idempotencyKey = req.get('Idempotency-Key');
  if (idempotencyKey) {
    const existing = await Order.findOne({ idempotencyKey });
    if (existing) return res.status(200).json({ success: true, order: existing, replayed: true });
  }

  // Merge duplicate product lines
  const merged = new Map();
  for (const { productId, quantity } of items) {
    const q = Number(quantity);
    if (!productId || !Number.isInteger(q) || q < 1) throw new AppError('Each item needs productId and a positive integer quantity');
    merged.set(String(productId), (merged.get(String(productId)) || 0) + q);
  }

  const reserved = [];
  const orderItems = [];
  try {
    for (const [productId, quantity] of merged) {
      // Atomic: only decrements if enough stock remains -> no overselling under concurrency
      const product = await Product.findOneAndUpdate(
        { _id: productId, isActive: true, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      );
      if (!product) {
        const p = await Product.findById(productId);
        if (!p || !p.isActive) throw new AppError(`Product ${productId} not found`, 404);
        throw new AppError(`Insufficient stock for "${p.name}" (available: ${p.stock})`, 400);
      }
      reserved.push({ product: product._id, quantity });
      orderItems.push({ product: product._id, name: product.name, sku: product.sku, price: product.price, quantity });
    }

    const totalAmount = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const order = await Order.create({
      customer: req.user._id,
      items: orderItems,
      totalAmount,
      shippingAddress,
      ...(idempotencyKey ? { idempotencyKey } : {}),
      statusHistory: [{ status: 'pending', changedBy: req.user._id, note: 'Order placed' }],
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    if (err?.code === 11000 && idempotencyKey) {
      // Concurrent retry won the race -> return the order it created
      const existing = await Order.findOne({ idempotencyKey });
      if (existing) return res.status(200).json({ success: true, order: existing, replayed: true });
    }
    await restock(reserved); // roll back any stock already reserved
    throw err;
  }
});

// Customers see their own orders; staff/admin see all
exports.listOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (req.user.role === 'customer') filter.customer = req.user._id;
  else if (req.query.customer) filter.customer = req.query.customer;
  if (status) {
    if (!STATUSES.includes(status)) throw new AppError('Invalid status filter');
    filter.status = status;
  }

  const p = Math.max(Number(page), 1);
  const l = Math.min(Math.max(Number(limit), 1), 100);
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('customer', 'name email').sort('-createdAt').skip((p - 1) * l).limit(l),
    Order.countDocuments(filter),
  ]);

  res.json({ success: true, total, page: p, pages: Math.ceil(total / l), orders });
});

exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('customer', 'name email');
  if (!order) throw new AppError('Order not found', 404);
  if (req.user.role === 'customer' && String(order.customer._id) !== String(req.user._id)) {
    throw new AppError('Order not found', 404); // don't leak existence
  }
  res.json({ success: true, order });
});

// Staff/admin: move an order through its lifecycle
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!STATUSES.includes(status)) throw new AppError(`status must be one of: ${STATUSES.join(', ')}`);

  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);

  if (!TRANSITIONS[order.status].includes(status)) {
    throw new AppError(`Cannot change status from "${order.status}" to "${status}"`);
  }

  if (status === 'cancelled') await restock(order.items);

  order.status = status;
  order.statusHistory.push({ status, changedBy: req.user._id, note });
  await order.save();

  res.json({ success: true, order });
});

// Customer: cancel own order while still pending
exports.cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
  if (!order) throw new AppError('Order not found', 404);
  if (order.status !== 'pending') throw new AppError('Only pending orders can be cancelled by the customer');

  await restock(order.items);
  order.status = 'cancelled';
  order.statusHistory.push({ status: 'cancelled', changedBy: req.user._id, note: 'Cancelled by customer' });
  await order.save();

  res.json({ success: true, order });
});

// Admin/staff: simple dashboard numbers
exports.stats = asyncHandler(async (_req, res) => {
  const [byStatus, revenue] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
  ]);
  res.json({
    success: true,
    ordersByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    revenue: revenue[0]?.total || 0,
  });
});
