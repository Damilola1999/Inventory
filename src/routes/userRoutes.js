const router = require('express').Router();
const { createUser, listUsers, updateUser } = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('admin'));
router.route('/').get(listUsers).post(createUser);
router.patch('/:id', updateUser);

module.exports = router;
