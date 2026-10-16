const router = require('express').Router();
const c = require('../controllers/productController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.get('/low-stock', restrictTo('admin', 'staff'), c.lowStock);
router.route('/').get(c.listProducts).post(restrictTo('admin'), c.createProduct);
router
  .route('/:id')
  .get(c.getProduct)
  .patch(restrictTo('admin'), c.updateProduct)
  .delete(restrictTo('admin'), c.deleteProduct);
router.post('/:id/stock', restrictTo('admin'), c.adjustStock);

module.exports = router;
