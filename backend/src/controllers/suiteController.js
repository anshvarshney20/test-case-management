const { query } = require('../config/db');
const { getCache, setCache, delCache } = require('../config/redis');
const { sanitizeObject } = require('../utils/sanitize');

const CACHE_TTL = 1800; // 30 minutes

const listSuites = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const cacheKey = `suites:project:${projectId}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const result = await query(
      `SELECT ts.*,
         u.full_name AS created_by_name,
         (SELECT COUNT(*)::int FROM test_suite_cases tsc WHERE tsc.suite_id = ts.id) AS case_count
       FROM test_suites ts
       LEFT JOIN users u ON u.id = ts.created_by
       WHERE ts.project_id = $1
       ORDER BY ts.updated_at DESC`,
      [projectId]
    );

    const payload = { suites: result.rows, cached: false };
    await setCache(cacheKey, payload, CACHE_TTL);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list suites' });
  }
};

const getSuite = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT ts.*, u.full_name AS created_by_name
       FROM test_suites ts LEFT JOIN users u ON u.id = ts.created_by
       WHERE ts.id = $1`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Suite not found' });

    const cases = await query(
      `SELECT tc.*,
         (SELECT te.result FROM test_executions te
          WHERE te.test_case_id = tc.id ORDER BY te.executed_at DESC LIMIT 1) AS last_result
       FROM test_cases tc
       JOIN test_suite_cases tsc ON tsc.test_case_id = tc.id
       WHERE tsc.suite_id = $1
       ORDER BY tc.title`,
      [id]
    );

    res.json({ suite: result.rows[0], testCases: cases.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get suite' });
  }
};

const createSuite = async (req, res) => {
  try {
    const data = sanitizeObject(req.body, ['name', 'description']);
    const { project_id, name, description, test_case_ids } = data;
    if (!project_id || !name) return res.status(400).json({ error: 'project_id and name required' });

    const result = await query(
      `INSERT INTO test_suites (project_id, name, description, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [project_id, name, description || null, req.user.id]
    );
    const suite = result.rows[0];

    if (Array.isArray(test_case_ids)) {
      for (const tcId of test_case_ids) {
        await query(
          `INSERT INTO test_suite_cases (suite_id, test_case_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [suite.id, tcId]
        );
      }
    }

    await delCache(`suites:project:${project_id}`);
    res.status(201).json({ suite });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create suite' });
  }
};

const updateSuite = async (req, res) => {
  try {
    const { id } = req.params;
    const data = sanitizeObject(req.body, ['name', 'description']);
    const { name, description, test_case_ids } = data;

    const result = await query(
      `UPDATE test_suites SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [name || null, description ?? null, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Suite not found' });

    if (Array.isArray(test_case_ids)) {
      await query('DELETE FROM test_suite_cases WHERE suite_id = $1', [id]);
      for (const tcId of test_case_ids) {
        await query(
          `INSERT INTO test_suite_cases (suite_id, test_case_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, tcId]
        );
      }
    }

    await delCache(`suites:project:${result.rows[0].project_id}`);
    res.json({ suite: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update suite' });
  }
};

const deleteSuite = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM test_suites WHERE id = $1 RETURNING id, project_id', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Suite not found' });
    await delCache(`suites:project:${result.rows[0].project_id}`);
    res.json({ message: 'Suite deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete suite' });
  }
};

const addCases = async (req, res) => {
  try {
    const { id } = req.params;
    const { test_case_ids } = req.body;
    if (!Array.isArray(test_case_ids)) return res.status(400).json({ error: 'test_case_ids required' });
    for (const tcId of test_case_ids) {
      await query(
        `INSERT INTO test_suite_cases (suite_id, test_case_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [id, tcId]
      );
    }
    const suite = await query('SELECT project_id FROM test_suites WHERE id = $1', [id]);
    if (suite.rows.length) await delCache(`suites:project:${suite.rows[0].project_id}`);
    res.json({ message: 'Cases added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add cases' });
  }
};

const removeCase = async (req, res) => {
  try {
    const { id, caseId } = req.params;
    await query('DELETE FROM test_suite_cases WHERE suite_id = $1 AND test_case_id = $2', [id, caseId]);
    const suite = await query('SELECT project_id FROM test_suites WHERE id = $1', [id]);
    if (suite.rows.length) await delCache(`suites:project:${suite.rows[0].project_id}`);
    res.json({ message: 'Case removed from suite' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove case' });
  }
};

const suiteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT
         COUNT(DISTINCT tsc.test_case_id)::int AS total_cases,
         COUNT(te.id)::int AS total_executions,
         COUNT(*) FILTER (WHERE te.result = 'Pass')::int AS passed,
         COUNT(*) FILTER (WHERE te.result = 'Fail')::int AS failed,
         COUNT(*) FILTER (WHERE te.result = 'Blocked')::int AS blocked,
         COUNT(*) FILTER (WHERE te.result = 'Skipped')::int AS skipped
       FROM test_suite_cases tsc
       LEFT JOIN LATERAL (
         SELECT * FROM test_executions e
         WHERE e.test_case_id = tsc.test_case_id
         ORDER BY e.executed_at DESC LIMIT 1
       ) te ON true
       WHERE tsc.suite_id = $1`,
      [id]
    );
    res.json({ report: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get suite report' });
  }
};

module.exports = {
  listSuites,
  getSuite,
  createSuite,
  updateSuite,
  deleteSuite,
  addCases,
  removeCase,
  suiteReport,
};
