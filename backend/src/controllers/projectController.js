const { query } = require('../config/db');
const { getCache, setCache, delCache } = require('../config/redis');
const { sanitizeObject } = require('../utils/sanitize');

const CACHE_TTL = 3600; // 1 hour

const listProjects = async (req, res) => {
  try {
    const cacheKey = `projects:list:${req.user.id}:${req.user.role}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    let result;
    if (req.user.role === 'admin') {
      result = await query(
        `SELECT p.*, u.full_name AS created_by_name,
           (SELECT COUNT(*)::int FROM project_members pm WHERE pm.project_id = p.id) AS member_count,
           (SELECT COUNT(*)::int FROM test_cases tc WHERE tc.project_id = p.id) AS test_case_count
         FROM projects p
         LEFT JOIN users u ON u.id = p.created_by
         ORDER BY p.updated_at DESC`
      );
    } else {
      result = await query(
        `SELECT p.*, u.full_name AS created_by_name,
           (SELECT COUNT(*)::int FROM project_members pm WHERE pm.project_id = p.id) AS member_count,
           (SELECT COUNT(*)::int FROM test_cases tc WHERE tc.project_id = p.id) AS test_case_count
         FROM projects p
         LEFT JOIN users u ON u.id = p.created_by
         INNER JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
         ORDER BY p.updated_at DESC`,
        [req.user.id]
      );
    }

    const payload = { projects: result.rows, cached: false };
    await setCache(cacheKey, payload, CACHE_TTL);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list projects' });
  }
};

const getProject = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `project:${id}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const result = await query(
      `SELECT p.*, u.full_name AS created_by_name
       FROM projects p LEFT JOIN users u ON u.id = p.created_by
       WHERE p.id = $1`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Project not found' });

    const members = await query(
      `SELECT u.id, u.email, u.full_name, u.role, pm.assigned_at
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1`,
      [id]
    );

    const payload = { project: result.rows[0], members: members.rows, cached: false };
    await setCache(cacheKey, payload, CACHE_TTL);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get project' });
  }
};

const createProject = async (req, res) => {
  try {
    const data = sanitizeObject(req.body, ['name', 'description', 'version', 'status']);
    const { name, description, version, status, memberIds } = data;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const result = await query(
      `INSERT INTO projects (name, description, version, status, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description || null, version || '1.0.0', status || 'active', req.user.id]
    );
    const project = result.rows[0];

    await query(
      `INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [project.id, req.user.id]
    );

    if (Array.isArray(memberIds)) {
      for (const uid of memberIds) {
        await query(
          `INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [project.id, uid]
        );
      }
    }

    await delCache('projects:list:*');
    res.status(201).json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const data = sanitizeObject(req.body, ['name', 'description', 'version', 'status']);
    const { name, description, version, status, memberIds } = data;

    const result = await query(
      `UPDATE projects SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         version = COALESCE($3, version),
         status = COALESCE($4, status),
         updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [name || null, description ?? null, version || null, status || null, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Project not found' });

    if (Array.isArray(memberIds)) {
      await query('DELETE FROM project_members WHERE project_id = $1', [id]);
      for (const uid of memberIds) {
        await query(
          `INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, uid]
        );
      }
    }

    await delCache('projects:list:*');
    await delCache(`project:${id}`);
    res.json({ project: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Project not found' });
    await delCache('projects:list:*');
    await delCache(`project:${id}`);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

module.exports = { listProjects, getProject, createProject, updateProject, deleteProject };
