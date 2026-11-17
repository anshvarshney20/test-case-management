const { query } = require('../config/db');
const { delCache } = require('../config/redis');
const { sanitizeObject, sanitizeString } = require('../utils/sanitize');

const listTestCases = async (req, res) => {
  try {
    const {
      projectId,
      search,
      priority,
      type,
      tag,
      assignedTo,
      suiteId,
      page = 1,
      limit = 20,
      sortBy = 'updated_at',
      sortDir = 'DESC',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * pageLimit;

    const allowedSort = ['updated_at', 'created_at', 'title', 'priority', 'type'];
    const sort = allowedSort.includes(sortBy) ? sortBy : 'updated_at';
    const dir = sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const conditions = [];
    const params = [];
    let idx = 1;

    if (projectId) {
      conditions.push(`tc.project_id = $${idx++}`);
      params.push(projectId);
    }
    if (search) {
      conditions.push(`(tc.title ILIKE $${idx} OR tc.description ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (priority) {
      conditions.push(`tc.priority = $${idx++}`);
      params.push(priority);
    }
    if (type) {
      conditions.push(`tc.type = $${idx++}`);
      params.push(type);
    }
    if (tag) {
      conditions.push(`$${idx++} = ANY(tc.tags)`);
      params.push(tag);
    }
    if (assignedTo) {
      conditions.push(`tc.assigned_to = $${idx++}`);
      params.push(assignedTo);
    }
    if (suiteId) {
      conditions.push(
        `EXISTS (SELECT 1 FROM test_suite_cases tsc WHERE tsc.test_case_id = tc.id AND tsc.suite_id = $${idx++})`
      );
      params.push(suiteId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM test_cases tc ${where}`,
      params
    );

    const dataParams = [...params, pageLimit, offset];
    const result = await query(
      `SELECT tc.*,
         u.full_name AS assigned_to_name,
         c.full_name AS created_by_name,
         (
           SELECT te.result FROM test_executions te
           WHERE te.test_case_id = tc.id
           ORDER BY te.executed_at DESC LIMIT 1
         ) AS last_result
       FROM test_cases tc
       LEFT JOIN users u ON u.id = tc.assigned_to
       LEFT JOIN users c ON c.id = tc.created_by
       ${where}
       ORDER BY tc.${sort} ${dir}
       LIMIT $${idx++} OFFSET $${idx}`,
      dataParams
    );

    res.json({
      testCases: result.rows,
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total: countResult.rows[0].total,
        totalPages: Math.ceil(countResult.rows[0].total / pageLimit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list test cases' });
  }
};

const getTestCase = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT tc.*,
         u.full_name AS assigned_to_name,
         c.full_name AS created_by_name
       FROM test_cases tc
       LEFT JOIN users u ON u.id = tc.assigned_to
       LEFT JOIN users c ON c.id = tc.created_by
       WHERE tc.id = $1`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Test case not found' });

    const steps = await query(
      `SELECT * FROM test_steps WHERE test_case_id = $1 ORDER BY step_number`,
      [id]
    );
    const suites = await query(
      `SELECT ts.id, ts.name FROM test_suites ts
       JOIN test_suite_cases tsc ON tsc.suite_id = ts.id
       WHERE tsc.test_case_id = $1`,
      [id]
    );

    res.json({ testCase: result.rows[0], steps: steps.rows, suites: suites.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get test case' });
  }
};

const createTestCase = async (req, res) => {
  try {
    const data = sanitizeObject(req.body, [
      'title',
      'description',
      'priority',
      'type',
      'pre_conditions',
      'post_conditions',
    ]);
    const {
      project_id,
      title,
      description,
      priority,
      type,
      pre_conditions,
      post_conditions,
      tags,
      assigned_to,
      steps,
      suite_ids,
    } = data;

    if (!project_id || !title) {
      return res.status(400).json({ error: 'project_id and title are required' });
    }

    const result = await query(
      `INSERT INTO test_cases
        (project_id, title, description, priority, type, pre_conditions, post_conditions, tags, assigned_to, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        project_id,
        title,
        description || null,
        priority || 'Medium',
        type || 'Functional',
        pre_conditions || null,
        post_conditions || null,
        Array.isArray(tags) ? tags.map(sanitizeString) : [],
        assigned_to || null,
        req.user.id,
      ]
    );
    const testCase = result.rows[0];

    if (Array.isArray(steps)) {
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await query(
          `INSERT INTO test_steps (test_case_id, step_number, action, expected_result)
           VALUES ($1, $2, $3, $4)`,
          [testCase.id, i + 1, sanitizeString(s.action || ''), sanitizeString(s.expected_result || '')]
        );
      }
    }

    if (Array.isArray(suite_ids)) {
      for (const sid of suite_ids) {
        await query(
          `INSERT INTO test_suite_cases (suite_id, test_case_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [sid, testCase.id]
        );
      }
    }

    await delCache('analytics:*');
    await delCache('suites:*');
    res.status(201).json({ testCase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create test case' });
  }
};

const updateTestCase = async (req, res) => {
  try {
    const { id } = req.params;
    const data = sanitizeObject(req.body, [
      'title',
      'description',
      'priority',
      'type',
      'pre_conditions',
      'post_conditions',
    ]);
    const {
      title,
      description,
      priority,
      type,
      pre_conditions,
      post_conditions,
      tags,
      assigned_to,
      status,
      steps,
    } = data;

    const result = await query(
      `UPDATE test_cases SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         priority = COALESCE($3, priority),
         type = COALESCE($4, type),
         pre_conditions = COALESCE($5, pre_conditions),
         post_conditions = COALESCE($6, post_conditions),
         tags = COALESCE($7, tags),
         assigned_to = COALESCE($8, assigned_to),
         status = COALESCE($9, status),
         updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [
        title || null,
        description ?? null,
        priority || null,
        type || null,
        pre_conditions ?? null,
        post_conditions ?? null,
        Array.isArray(tags) ? tags.map(sanitizeString) : null,
        assigned_to ?? null,
        status || null,
        id,
      ]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Test case not found' });

    if (Array.isArray(steps)) {
      await query('DELETE FROM test_steps WHERE test_case_id = $1', [id]);
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await query(
          `INSERT INTO test_steps (test_case_id, step_number, action, expected_result)
           VALUES ($1, $2, $3, $4)`,
          [id, i + 1, sanitizeString(s.action || ''), sanitizeString(s.expected_result || '')]
        );
      }
    }

    await delCache('analytics:*');
    res.json({ testCase: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update test case' });
  }
};

const deleteTestCase = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM test_cases WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Test case not found' });
    await delCache('analytics:*');
    await delCache('suites:*');
    res.json({ message: 'Test case deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete test case' });
  }
};

const bulkUpdate = async (req, res) => {
  try {
    const { ids, action, priority, suite_id } = req.body;
    if (!Array.isArray(ids) || !ids.length || !action) {
      return res.status(400).json({ error: 'ids and action are required' });
    }

    if (action === 'delete') {
      await query('DELETE FROM test_cases WHERE id = ANY($1::int[])', [ids]);
    } else if (action === 'update_priority') {
      if (!priority) return res.status(400).json({ error: 'priority required' });
      await query(
        'UPDATE test_cases SET priority = $1, updated_at = NOW() WHERE id = ANY($2::int[])',
        [priority, ids]
      );
    } else if (action === 'assign_suite') {
      if (!suite_id) return res.status(400).json({ error: 'suite_id required' });
      for (const id of ids) {
        await query(
          `INSERT INTO test_suite_cases (suite_id, test_case_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [suite_id, id]
        );
      }
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    await delCache('analytics:*');
    await delCache('suites:*');
    res.json({ message: `Bulk ${action} completed`, count: ids.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Bulk operation failed' });
  }
};

const exportCsv = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const result = await query(
      `SELECT id, title, description, priority, type, pre_conditions, post_conditions,
              array_to_string(tags, ';') AS tags, status
       FROM test_cases WHERE project_id = $1 ORDER BY id`,
      [projectId]
    );

    const header = 'id,title,description,priority,type,pre_conditions,post_conditions,tags,status\n';
    const rows = result.rows
      .map((r) =>
        [r.id, r.title, r.description, r.priority, r.type, r.pre_conditions, r.post_conditions, r.tags, r.status]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=test-cases.csv');
    res.send(header + rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export failed' });
  }
};

module.exports = {
  listTestCases,
  getTestCase,
  createTestCase,
  updateTestCase,
  deleteTestCase,
  bulkUpdate,
  exportCsv,
};
