const router = require('express').Router();
const c = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.get('/stats', restrictTo('admin', 'staff'), c.stats);
router.route('/').get(c.listOrders).post(restrictTo('customer'), c.createOrder);
router.get('/:id', c.getOrder);
router.patch('/:id/status', restrictTo('admin', 'staff'), c.updateStatus);
router.patch('/:id/cancel', restrictTo('customer'), c.cancelMyOrder);

module.exports = router;
