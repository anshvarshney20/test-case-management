import { useState, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';

const empty = { name: '', description: '', version: '1.0.0', status: 'active' };

export default function Projects() {
  const { permissions } = useAuth();
  const { projects, refreshProjects, selectProject, currentProject } = useProject();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const onChange = useCallback((e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }, []);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(empty);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((p) => {
    setEditing(p.id);
    setForm({
      name: p.name,
      description: p.description || '',
      version: p.version || '1.0.0',
      status: p.status,
    });
    setShowForm(true);
  }, []);

  const save = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');
      try {
        if (editing) await api.put(`/projects/${editing}`, form);
        else await api.post('/projects', form);
        setShowForm(false);
        await refreshProjects();
      } catch (err) {
        setError(err.response?.data?.error || 'Save failed');
      }
    },
    [editing, form, refreshProjects]
  );

  const remove = useCallback(
    async (id) => {
      if (!window.confirm('Delete this project and all related data?')) return;
      try {
        await api.delete(`/projects/${id}`);
        await refreshProjects();
      } catch (err) {
        setError(err.response?.data?.error || 'Delete failed');
      }
    },
    [refreshProjects]
  );

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="muted">Organize test workstreams by product or release.</p>
        </div>
        {permissions.manageProjects && (
          <button type="button" className="btn primary" onClick={openCreate}>
            New project
          </button>
        )}
      </header>

      {error && <div className="alert error">{error}</div>}

      {showForm && (
        <form className="panel form-grid" onSubmit={save}>
          <h3>{editing ? 'Edit project' : 'Create project'}</h3>
          <label>
            Name
            <input name="name" value={form.name} onChange={onChange} required />
          </label>
          <label>
            Version
            <input name="version" value={form.version} onChange={onChange} />
          </label>
          <label>
            Status
            <select name="status" value={form.status} onChange={onChange}>
              <option value="active">Active</option>
              <option value="on-hold">On hold</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="full">
            Description
            <textarea name="description" value={form.description} onChange={onChange} rows={3} />
          </label>
          <div className="form-actions full">
            <button type="submit" className="btn primary">
              Save
            </button>
            <button type="button" className="btn ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="card-list">
        {projects.map((p) => (
          <article
            key={p.id}
            className={`project-card ${currentProject?.id === p.id ? 'active' : ''}`}
          >
            <div>
              <h3>{p.name}</h3>
              <p className="muted">{p.description || 'No description'}</p>
              <div className="meta-row">
                <span>v{p.version}</span>
                <span className={`status ${p.status}`}>{p.status}</span>
                <span>{p.test_case_count ?? 0} cases</span>
                <span>{p.member_count ?? 0} members</span>
              </div>
            </div>
            <div className="card-actions">
              <button type="button" className="btn soft" onClick={() => selectProject(p)}>
                Open
              </button>
              {permissions.manageProjects && (
                <button type="button" className="btn ghost" onClick={() => openEdit(p)}>
                  Edit
                </button>
              )}
              {permissions.manageUsers && (
                <button type="button" className="btn danger" onClick={() => remove(p.id)}>
                  Delete
                </button>
              )}
            </div>
          </article>
        ))}
        {!projects.length && <p className="muted">No projects yet.</p>}
      </div>
    </div>
  );
}
