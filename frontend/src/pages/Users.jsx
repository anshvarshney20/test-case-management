import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'tester',
  });
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/users').then((res) => setUsers(res.data.users || []));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/users', form);
      setForm({ email: '', password: '', full_name: '', role: 'tester' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Create failed');
    }
  };

  const updateRole = async (id, role) => {
    await api.put(`/users/${id}`, { role });
    load();
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>User management</h1>
          <p className="muted">Admin-only access to accounts and roles.</p>
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}

      <form className="panel form-grid" onSubmit={create}>
        <h3>Create user</h3>
        <label>
          Full name
          <input
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
          />
        </label>
        <label>
          Role
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          >
            {['admin', 'test-lead', 'tester', 'read-only'].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <div className="form-actions">
          <button type="submit" className="btn primary">
            Create
          </button>
        </div>
      </form>

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name}</td>
                <td>{u.email}</td>
                <td>
                  <select value={u.role} onChange={(e) => updateRole(u.id, e.target.value)}>
                    {['admin', 'test-lead', 'tester', 'read-only'].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{u.is_active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
