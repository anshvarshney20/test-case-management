import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import VirtualTestList from '../components/VirtualTestList';

const emptyForm = {
  title: '',
  description: '',
  priority: 'Medium',
  type: 'Functional',
  pre_conditions: '',
  post_conditions: '',
  tags: '',
  steps: [{ action: '', expected_result: '' }],
};

export default function TestCases() {
  const { permissions } = useAuth();
  const { currentProject } = useProject();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', priority: '', type: '' });
  const [selected, setSelected] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [suites, setSuites] = useState([]);
  const [bulkSuite, setBulkSuite] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (page = 1) => {
      if (!currentProject) return;
      setLoading(true);
      try {
        const res = await api.get('/testcases', {
          params: {
            projectId: currentProject.id,
            page,
            limit: 50,
            search: filters.search || undefined,
            priority: filters.priority || undefined,
            type: filters.type || undefined,
          },
        });
        setItems(res.data.testCases);
        setPagination(res.data.pagination);
        setSelected(new Set());
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load');
      } finally {
        setLoading(false);
      }
    },
    [currentProject, filters]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    if (!currentProject) return;
    api.get('/suites', { params: { projectId: currentProject.id } }).then((res) => {
      setSuites(res.data.suites || []);
    });
  }, [currentProject]);

  const onFilter = useCallback((e) => {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));
  }, []);

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const sortedItems = useMemo(() => items, [items]);

  const updateStep = useCallback((idx, field, value) => {
    setForm((f) => {
      const steps = f.steps.map((s, i) => (i === idx ? { ...s, [field]: value } : s));
      return { ...f, steps };
    });
  }, []);

  const addStep = useCallback(() => {
    setForm((f) => ({ ...f, steps: [...f.steps, { action: '', expected_result: '' }] }));
  }, []);

  const save = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');
      try {
        await api.post('/testcases', {
          project_id: currentProject.id,
          title: form.title,
          description: form.description,
          priority: form.priority,
          type: form.type,
          pre_conditions: form.pre_conditions,
          post_conditions: form.post_conditions,
          tags: form.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          steps: form.steps.filter((s) => s.action || s.expected_result),
        });
        setShowForm(false);
        setForm(emptyForm);
        load(1);
      } catch (err) {
        setError(err.response?.data?.error || 'Create failed');
      }
    },
    [form, currentProject, load]
  );

  const bulk = useCallback(
    async (action, extra = {}) => {
      if (!selected.size) return;
      try {
        await api.post('/testcases/bulk', { ids: [...selected], action, ...extra });
        load(pagination.page);
      } catch (err) {
        setError(err.response?.data?.error || 'Bulk action failed');
      }
    },
    [selected, load, pagination.page]
  );

  const exportCsv = useCallback(async () => {
    try {
      const res = await api.get('/testcases/export', {
        params: { projectId: currentProject.id },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'test-cases.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || 'Export failed');
    }
  }, [currentProject]);

  if (!currentProject) {
    return (
      <div className="page">
        <h1>Test Cases</h1>
        <p className="muted">Select a project first.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Test Cases</h1>
          <p className="muted">{pagination.total} cases · page {pagination.page}</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn soft" onClick={exportCsv}>
            Export CSV
          </button>
          {permissions.manageTestCases && (
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setForm(emptyForm);
                setShowForm(true);
              }}
            >
              New case
            </button>
          )}
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}

      <div className="filters">
        <input
          name="search"
          placeholder="Search title or description…"
          value={filters.search}
          onChange={onFilter}
        />
        <select name="priority" value={filters.priority} onChange={onFilter}>
          <option value="">All priorities</option>
          {['Low', 'Medium', 'High', 'Critical'].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select name="type" value={filters.type} onChange={onFilter}>
          <option value="">All types</option>
          {['Functional', 'Integration', 'Regression', 'Smoke', 'UI', 'API'].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {permissions.manageTestCases && selected.size > 0 && (
        <div className="bulk-bar">
          <span>{selected.size} selected</span>
          <button type="button" className="btn danger" onClick={() => bulk('delete')}>
            Delete
          </button>
          <button
            type="button"
            className="btn soft"
            onClick={() => bulk('update_priority', { priority: 'High' })}
          >
            Set High
          </button>
          <select value={bulkSuite} onChange={(e) => setBulkSuite(e.target.value)}>
            <option value="">Assign to suite…</option>
            {suites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn soft"
            disabled={!bulkSuite}
            onClick={() => bulk('assign_suite', { suite_id: Number(bulkSuite) })}
          >
            Assign
          </button>
        </div>
      )}

      {showForm && (
        <form className="panel form-grid" onSubmit={save}>
          <h3>Create test case</h3>
          <label className="full">
            Title
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </label>
          <label>
            Priority
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            >
              {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {['Functional', 'Integration', 'Regression', 'Smoke', 'UI', 'API'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="full">
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </label>
          <label>
            Pre-conditions
            <textarea
              value={form.pre_conditions}
              onChange={(e) => setForm((f) => ({ ...f, pre_conditions: e.target.value }))}
              rows={2}
            />
          </label>
          <label>
            Post-conditions
            <textarea
              value={form.post_conditions}
              onChange={(e) => setForm((f) => ({ ...f, post_conditions: e.target.value }))}
              rows={2}
            />
          </label>
          <label className="full">
            Tags (comma-separated)
            <input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            />
          </label>
          <div className="full">
            <h4>Steps</h4>
            {form.steps.map((s, i) => (
              <div key={i} className="step-row">
                <input
                  placeholder="Action"
                  value={s.action}
                  onChange={(e) => updateStep(i, 'action', e.target.value)}
                />
                <input
                  placeholder="Expected result"
                  value={s.expected_result}
                  onChange={(e) => updateStep(i, 'expected_result', e.target.value)}
                />
              </div>
            ))}
            <button type="button" className="btn soft" onClick={addStep}>
              Add step
            </button>
          </div>
          <div className="form-actions full">
            <button type="submit" className="btn primary">
              Create
            </button>
            <button type="button" className="btn ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="panel">
        {loading ? (
          <div className="page-loader">
            <div className="spinner" />
          </div>
        ) : (
          <VirtualTestList
            items={sortedItems}
            selected={selected}
            onToggle={toggle}
            canManage={permissions.manageTestCases}
          />
        )}
        <div className="pager">
          <button
            type="button"
            className="btn soft"
            disabled={pagination.page <= 1}
            onClick={() => load(pagination.page - 1)}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} / {pagination.totalPages || 1}
          </span>
          <button
            type="button"
            className="btn soft"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => load(pagination.page + 1)}
          >
            Next
          </button>
        </div>
        <p className="muted small">
          Tip: open a case for execution history — <Link to="/executions">Executions</Link>
        </p>
      </div>
    </div>
  );
}
