const express = require('express');
const {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', listProjects);
router.get('/:id', getProject);
router.post('/', authorize('admin', 'test-lead'), createProject);
router.put('/:id', authorize('admin', 'test-lead'), updateProject);
router.delete('/:id', authorize('admin'), deleteProject);

module.exports = router;
