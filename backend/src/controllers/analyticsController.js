const { query } = require('../config/db');
const { getCache, setCache, getCacheStats } = require('../config/redis');

const CACHE_TTL = 900; // 15 minutes

const getDashboard = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const cacheKey = `analytics:dashboard:${projectId}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true, cacheStats: getCacheStats() });
    }

    const summary = await query(
      `WITH latest AS (
         SELECT DISTINCT ON (test_case_id) test_case_id, result
         FROM test_executions
         WHERE project_id = $1
         ORDER BY test_case_id, executed_at DESC
       )
       SELECT
         (SELECT COUNT(*)::int FROM test_cases WHERE project_id = $1) AS total_cases,
         COUNT(*)::int AS executed_cases,
         COUNT(*) FILTER (WHERE result = 'Pass')::int AS passed,
         COUNT(*) FILTER (WHERE result = 'Fail')::int AS failed,
         COUNT(*) FILTER (WHERE result = 'Blocked')::int AS blocked,
         COUNT(*) FILTER (WHERE result = 'Skipped')::int AS skipped
       FROM latest`,
      [projectId]
    );

    const totalCases = summary.rows[0].total_cases || 0;
    const executed = summary.rows[0].executed_cases || 0;
    const pending = Math.max(0, totalCases - executed);

    const priorityDist = await query(
      `SELECT priority, COUNT(*)::int AS count
       FROM test_cases WHERE project_id = $1
       GROUP BY priority ORDER BY priority`,
      [projectId]
    );

    const typeDist = await query(
      `SELECT type, COUNT(*)::int AS count
       FROM test_cases WHERE project_id = $1
       GROUP BY type ORDER BY type`,
      [projectId]
    );

    const trends = await query(
      `SELECT DATE(executed_at) AS day,
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE result = 'Pass')::int AS passed,
         COUNT(*) FILTER (WHERE result = 'Fail')::int AS failed
       FROM test_executions
       WHERE project_id = $1 AND executed_at >= NOW() - INTERVAL '14 days'
       GROUP BY DATE(executed_at)
       ORDER BY day`,
      [projectId]
    );

    const byTester = await query(
      `SELECT u.id, u.full_name,
         COUNT(te.id)::int AS total,
         COUNT(*) FILTER (WHERE te.result = 'Pass')::int AS passed,
         COUNT(*) FILTER (WHERE te.result = 'Fail')::int AS failed
       FROM test_executions te
       JOIN users u ON u.id = te.executed_by
       WHERE te.project_id = $1 AND te.executed_at >= NOW() - INTERVAL '30 days'
       GROUP BY u.id, u.full_name
       ORDER BY total DESC`,
      [projectId]
    );

    const passFailByPriority = await query(
      `WITH latest AS (
         SELECT DISTINCT ON (te.test_case_id) te.test_case_id, te.result, tc.priority
         FROM test_executions te
         JOIN test_cases tc ON tc.id = te.test_case_id
         WHERE te.project_id = $1
         ORDER BY te.test_case_id, te.executed_at DESC
       )
       SELECT priority,
         COUNT(*) FILTER (WHERE result = 'Pass')::int AS passed,
         COUNT(*) FILTER (WHERE result = 'Fail')::int AS failed,
         COUNT(*)::int AS total
       FROM latest
       GROUP BY priority`,
      [projectId]
    );

    const defects = await query(
      `SELECT
         COUNT(*)::int AS total_defects,
         COUNT(*) FILTER (WHERE status = 'Open')::int AS open_defects,
         COUNT(*) FILTER (WHERE severity = 'Critical')::int AS critical
       FROM defects WHERE project_id = $1`,
      [projectId]
    );

    const coverage =
      totalCases > 0 ? Math.round((executed / totalCases) * 1000) / 10 : 0;
    const passRate =
      executed > 0
        ? Math.round(((summary.rows[0].passed || 0) / executed) * 1000) / 10
        : 0;
    const defectDensity =
      totalCases > 0
        ? Math.round(((defects.rows[0].total_defects || 0) / totalCases) * 1000) / 10
        : 0;

    const payload = {
      summary: {
        ...summary.rows[0],
        pending,
        coverage,
        passRate,
        defectDensity,
      },
      priorityDistribution: priorityDist.rows,
      typeDistribution: typeDist.rows,
      trends: trends.rows,
      byTester: byTester.rows,
      passFailByPriority: passFailByPriority.rows,
      defects: defects.rows[0],
      cached: false,
      cacheStats: getCacheStats(),
    };

    await setCache(cacheKey, payload, CACHE_TTL);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
};

const getCacheMetrics = async (_req, res) => {
  const stats = getCacheStats();
  // Warm a known key to demonstrate hit
  const sample = await getCache('analytics:dashboard:1');
  res.json({
    ...stats,
    sampleHit: !!sample,
    ttlSeconds: { analytics: 900, suites: 1800, projects: 3600 },
  });
};

module.exports = { getDashboard, getCacheMetrics };
