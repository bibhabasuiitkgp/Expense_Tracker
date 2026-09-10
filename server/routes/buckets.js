const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const bucketController = require('../controllers/bucketController');

router.use(auth);

router.get('/', bucketController.getBuckets);
router.post('/', bucketController.createBucket);
router.put('/:id', bucketController.updateBucket);
router.delete('/:id', bucketController.deleteBucket);

module.exports = router;
