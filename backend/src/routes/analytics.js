const express = require('express');
const { getDashboard, getCacheMetrics } = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');
const { analyticsLimiter } = require('../middleware/rateLimits');

const router = express.Router();

router.use(authenticate, analyticsLimiter);

router.get('/dashboard', getDashboard);
router.get('/cache-metrics', getCacheMetrics);

module.exports = router;
