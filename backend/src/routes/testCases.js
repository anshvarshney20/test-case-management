const express = require('express');
const {
  listTestCases,
  getTestCase,
  createTestCase,
  updateTestCase,
  deleteTestCase,
  bulkUpdate,
  exportCsv,
} = require('../controllers/testCaseController');
const { authenticate, authorize } = require('../middleware/auth');
const { testCaseLimiter } = require('../middleware/rateLimits');

const router = express.Router();

router.use(authenticate);

router.get('/', listTestCases);
router.get('/export', exportCsv);
router.get('/:id', getTestCase);
router.post('/', testCaseLimiter, authorize('admin', 'test-lead'), createTestCase);
router.put('/:id', testCaseLimiter, authorize('admin', 'test-lead'), updateTestCase);
router.delete('/:id', testCaseLimiter, authorize('admin', 'test-lead'), deleteTestCase);
router.post('/bulk', testCaseLimiter, authorize('admin', 'test-lead'), bulkUpdate);

module.exports = router;
