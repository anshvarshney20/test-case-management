import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useProject } from '../context/ProjectContext';

export default function Executions() {
  const { currentProject } = useProject();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [resultFilter, setResultFilter] = useState('');

  const load = useCallback(
    async (page = 1) => {
      if (!currentProject) return;
      const res = await api.get('/testexecutions', {
        params: {
          projectId: currentProject.id,
          page,
          limit: 25,
          result: resultFilter || undefined,
        },
      });
      setItems(res.data.executions);
      setPagination(res.data.pagination);
    },
    [currentProject, resultFilter]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  if (!currentProject) {
    return (
      <div className="page">
        <h1>Executions</h1>
        <p className="muted">Select a project first.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Test Executions</h1>
          <p className="muted">Audit trail of runs across the project.</p>
        </div>
        <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
          <option value="">All results</option>
          {['Pass', 'Fail', 'Blocked', 'Skipped', 'Pending'].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </header>

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Case</th>
              <th>Result</th>
              <th>Tester</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.executed_at).toLocaleString()}</td>
                <td>
                  <Link to={`/test-cases/${e.test_case_id}`}>{e.test_case_title}</Link>
                </td>
                <td>
                  <span className={`result ${e.result}`}>{e.result}</span>
                </td>
                <td>{e.executed_by_name}</td>
                <td>{e.comments || '—'}</td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={5} className="muted">
                  No executions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
    </div>
  );
}
