const express = require('express');
const {
  listExecutions,
  createExecution,
  executeSuite,
  getHistory,
  assignTest,
  createDefect,
  listDefects,
} = require('../controllers/executionController');
const { authenticate, authorize } = require('../middleware/auth');
const { executionLimiter } = require('../middleware/rateLimits');
const { upload } = require('../middleware/upload');
const { query } = require('../config/db');

const router = express.Router();

router.use(authenticate);

router.get('/', listExecutions);
router.get('/defects', listDefects);
router.get('/history/:testCaseId', getHistory);

router.post('/', executionLimiter, authorize('admin', 'test-lead', 'tester'), createExecution);
router.post('/suite', executionLimiter, authorize('admin', 'test-lead', 'tester'), executeSuite);
router.post('/assign', authorize('admin', 'test-lead'), assignTest);
router.post('/defects', authorize('admin', 'test-lead', 'tester'), createDefect);

router.post(
  '/:id/attachments',
  executionLimiter,
  authorize('admin', 'test-lead', 'tester'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const result = await query(
        `INSERT INTO attachments
          (test_execution_id, filename, original_name, mime_type, size_bytes, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [
          req.params.id,
          req.file.filename,
          req.file.originalname,
          req.file.mimetype,
          req.file.size,
          req.user.id,
        ]
      );
      res.status(201).json({ attachment: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

module.exports = router;
