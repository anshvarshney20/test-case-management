const { query } = require('../config/db');
const { delCache } = require('../config/redis');
const { sanitizeObject, sanitizeString } = require('../utils/sanitize');

const listExecutions = async (req, res) => {
  try {
    const { projectId, testCaseId, executedBy, result, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * pageLimit;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (projectId) {
      conditions.push(`te.project_id = $${idx++}`);
      params.push(projectId);
    }
    if (testCaseId) {
      conditions.push(`te.test_case_id = $${idx++}`);
      params.push(testCaseId);
    }
    if (executedBy) {
      conditions.push(`te.executed_by = $${idx++}`);
      params.push(executedBy);
    }
    if (result) {
      conditions.push(`te.result = $${idx++}`);
      params.push(result);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const count = await query(`SELECT COUNT(*)::int AS total FROM test_executions te ${where}`, params);

    const dataParams = [...params, pageLimit, offset];
    const rows = await query(
      `SELECT te.*,
         tc.title AS test_case_title,
         u.full_name AS executed_by_name,
         ts.name AS suite_name
       FROM test_executions te
       JOIN test_cases tc ON tc.id = te.test_case_id
       LEFT JOIN users u ON u.id = te.executed_by
       LEFT JOIN test_suites ts ON ts.id = te.suite_id
       ${where}
       ORDER BY te.executed_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      dataParams
    );

    res.json({
      executions: rows.rows,
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total: count.rows[0].total,
        totalPages: Math.ceil(count.rows[0].total / pageLimit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list executions' });
  }
};

const createExecution = async (req, res) => {
  try {
    const data = sanitizeObject(req.body, ['comments', 'result']);
    const { test_case_id, project_id, suite_id, result, comments, duration_ms, create_defect } = data;

    if (!test_case_id || !project_id || !result) {
      return res.status(400).json({ error: 'test_case_id, project_id, and result are required' });
    }

    const allowed = ['Pass', 'Fail', 'Blocked', 'Skipped', 'Pending'];
    if (!allowed.includes(result)) {
      return res.status(400).json({ error: 'Invalid result value' });
    }

    const er = await query(
      `INSERT INTO test_executions
        (test_case_id, project_id, suite_id, executed_by, result, comments, duration_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        test_case_id,
        project_id,
        suite_id || null,
        req.user.id,
        result,
        comments || null,
        duration_ms || null,
      ]
    );

    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user.id,
        'EXECUTE',
        'test_execution',
        er.rows[0].id,
        JSON.stringify({ test_case_id, result }),
      ]
    );

    let defect = null;
    if (result === 'Fail' && create_defect) {
      const tc = await query('SELECT title FROM test_cases WHERE id = $1', [test_case_id]);
      const dr = await query(
        `INSERT INTO defects
          (project_id, test_execution_id, test_case_id, title, description, severity, reported_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          project_id,
          er.rows[0].id,
          test_case_id,
          `Defect from: ${tc.rows[0]?.title || test_case_id}`,
          comments || 'Created from failed test execution',
          'High',
          req.user.id,
        ]
      );
      defect = dr.rows[0];
    }

    await delCache('analytics:*');
    res.status(201).json({ execution: er.rows[0], defect });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record execution' });
  }
};

const executeSuite = async (req, res) => {
  try {
    const { suite_id, results } = req.body;
    // results: [{ test_case_id, result, comments }]
    if (!suite_id || !Array.isArray(results)) {
      return res.status(400).json({ error: 'suite_id and results array required' });
    }

    const suite = await query('SELECT * FROM test_suites WHERE id = $1', [suite_id]);
    if (!suite.rows.length) return res.status(404).json({ error: 'Suite not found' });

    const created = [];
    for (const item of results) {
      const r = await query(
        `INSERT INTO test_executions
          (test_case_id, project_id, suite_id, executed_by, result, comments)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [
          item.test_case_id,
          suite.rows[0].project_id,
          suite_id,
          req.user.id,
          item.result,
          sanitizeString(item.comments || '') || null,
        ]
      );
      created.push(r.rows[0]);
    }

    await delCache('analytics:*');
    res.status(201).json({ executions: created, count: created.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Suite execution failed' });
  }
};

const getHistory = async (req, res) => {
  try {
    const { testCaseId } = req.params;
    const result = await query(
      `SELECT te.*, u.full_name AS executed_by_name
       FROM test_executions te
       LEFT JOIN users u ON u.id = te.executed_by
       WHERE te.test_case_id = $1
       ORDER BY te.executed_at DESC
       LIMIT 50`,
      [testCaseId]
    );
    res.json({ history: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get history' });
  }
};

const assignTest = async (req, res) => {
  try {
    const { test_case_id, assigned_to } = req.body;
    if (!test_case_id || !assigned_to) {
      return res.status(400).json({ error: 'test_case_id and assigned_to required' });
    }
    const result = await query(
      `UPDATE test_cases SET assigned_to = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [assigned_to, test_case_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Test case not found' });
    res.json({ testCase: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Assignment failed' });
  }
};

const createDefect = async (req, res) => {
  try {
    const data = sanitizeObject(req.body, ['title', 'description', 'severity']);
    const { project_id, test_execution_id, test_case_id, title, description, severity } = data;
    if (!project_id || !title) {
      return res.status(400).json({ error: 'project_id and title required' });
    }
    const result = await query(
      `INSERT INTO defects
        (project_id, test_execution_id, test_case_id, title, description, severity, reported_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        project_id,
        test_execution_id || null,
        test_case_id || null,
        title,
        description || null,
        severity || 'Medium',
        req.user.id,
      ]
    );
    await delCache('analytics:*');
    res.status(201).json({ defect: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create defect' });
  }
};

const listDefects = async (req, res) => {
  try {
    const { projectId } = req.query;
    const params = [];
    let where = '';
    if (projectId) {
      where = 'WHERE d.project_id = $1';
      params.push(projectId);
    }
    const result = await query(
      `SELECT d.*, u.full_name AS reported_by_name, tc.title AS test_case_title
       FROM defects d
       LEFT JOIN users u ON u.id = d.reported_by
       LEFT JOIN test_cases tc ON tc.id = d.test_case_id
       ${where}
       ORDER BY d.created_at DESC`,
      params
    );
    res.json({ defects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list defects' });
  }
};

module.exports = {
  listExecutions,
  createExecution,
  executeSuite,
  getHistory,
  assignTest,
  createDefect,
  listDefects,
};
