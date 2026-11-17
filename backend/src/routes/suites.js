const express = require('express');
const {
  listSuites,
  getSuite,
  createSuite,
  updateSuite,
  deleteSuite,
  addCases,
  removeCase,
  suiteReport,
} = require('../controllers/suiteController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', listSuites);
router.get('/:id', getSuite);
router.get('/:id/report', suiteReport);
router.post('/', authorize('admin', 'test-lead'), createSuite);
router.put('/:id', authorize('admin', 'test-lead'), updateSuite);
router.delete('/:id', authorize('admin', 'test-lead'), deleteSuite);
router.post('/:id/cases', authorize('admin', 'test-lead'), addCases);
router.delete('/:id/cases/:caseId', authorize('admin', 'test-lead'), removeCase);

module.exports = router;
