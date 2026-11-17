const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { sanitizeObject } = require('../utils/sanitize');

const listUsers = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, full_name, role, is_active, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list users' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const data = sanitizeObject(req.body, ['full_name', 'role']);
    const { full_name, role, is_active } = data;

    const allowedRoles = ['admin', 'test-lead', 'tester', 'read-only'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = await query(
      `UPDATE users SET
         full_name = COALESCE($1, full_name),
         role = COALESCE($2, role),
         is_active = COALESCE($3, is_active),
         updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, full_name, role, is_active`,
      [full_name || null, role || null, typeof is_active === 'boolean' ? is_active : null, id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

const createUser = async (req, res) => {
  try {
    const data = sanitizeObject(req.body, ['email', 'full_name', 'password']);
    const { email, password, full_name, role } = data;
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'email, password, full_name required' });
    }
    const allowedRoles = ['admin', 'test-lead', 'tester', 'read-only'];
    const userRole = role && allowedRoles.includes(role) ? role : 'tester';
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role, is_active, created_at`,
      [email.toLowerCase(), hash, full_name, userRole]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

module.exports = { listUsers, updateUser, createUser };
