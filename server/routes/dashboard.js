const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const dc = require('../controllers/dashboardController');

router.use(auth);

router.get('/summary', dc.summary);
router.get('/trend', dc.trend);

module.exports = router;
