import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';

export default function Suites() {
  const { permissions } = useAuth();
  const { currentProject } = useProject();
  const [suites, setSuites] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [cached, setCached] = useState(false);

  const load = useCallback(() => {
    if (!currentProject) return;
    api
      .get('/suites', { params: { projectId: currentProject.id } })
      .then((res) => {
        setSuites(res.data.suites || []);
        setCached(!!res.data.cached);
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load suites'));
  }, [currentProject]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post('/suites', {
        project_id: currentProject.id,
        name,
        description,
      });
      setName('');
      setDescription('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Create failed');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this suite?')) return;
    await api.delete(`/suites/${id}`);
    load();
  };

  if (!currentProject) {
    return (
      <div className="page">
        <h1>Suites</h1>
        <p className="muted">Select a project first.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Test Suites</h1>
          <p className="muted">
            Group cases for batch execution{cached ? ' · cached list' : ''}
          </p>
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}

      {permissions.manageSuites && (
        <form className="panel form-grid" onSubmit={create}>
          <h3>Create suite</h3>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn primary">
              Create
            </button>
          </div>
        </form>
      )}

      <div className="card-list">
        {suites.map((s) => (
          <article key={s.id} className="project-card">
            <div>
              <h3>
                <Link to={`/suites/${s.id}`}>{s.name}</Link>
              </h3>
              <p className="muted">{s.description || 'No description'}</p>
              <div className="meta-row">
                <span>{s.case_count} cases</span>
                <span>{s.created_by_name}</span>
              </div>
            </div>
            {permissions.manageSuites && (
              <button type="button" className="btn danger" onClick={() => remove(s.id)}>
                Delete
              </button>
            )}
          </article>
        ))}
        {!suites.length && <p className="muted">No suites yet.</p>}
      </div>
    </div>
  );
}
