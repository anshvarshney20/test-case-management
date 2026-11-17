import { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const HistoryPanel = lazy(() => import('../components/HistoryPanel'));

export default function TestCaseDetail() {
  const { id } = useParams();
  const { permissions } = useAuth();
  const [data, setData] = useState(null);
  const [result, setResult] = useState('Pass');
  const [comments, setComments] = useState('');
  const [createDefect, setCreateDefect] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(() => {
    api
      .get(`/testcases/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load'));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const execute = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');
      setMessage('');
      try {
        const res = await api.post('/testexecutions', {
          test_case_id: Number(id),
          project_id: data.testCase.project_id,
          result,
          comments,
          create_defect: result === 'Fail' && createDefect,
        });
        setMessage(
          res.data.defect
            ? `Recorded ${result}. Defect #${res.data.defect.id} created.`
            : `Recorded ${result}.`
        );
        setShowHistory(true);
      } catch (err) {
        setError(err.response?.data?.error || 'Execution failed');
      }
    },
    [id, data, result, comments, createDefect]
  );

  if (error && !data) return <div className="page alert error">{error}</div>;
  if (!data) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  const { testCase, steps, suites } = data;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <Link to="/test-cases" className="muted">
            ← Test cases
          </Link>
          <h1>{testCase.title}</h1>
          <div className="meta-row">
            <span className={`prio ${testCase.priority}`}>{testCase.priority}</span>
            <span>{testCase.type}</span>
            {(testCase.tags || []).map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
        </div>
      </header>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="detail-grid">
        <section className="panel">
          <h3>Details</h3>
          <p>{testCase.description || 'No description'}</p>
          <p>
            <strong>Pre-conditions:</strong> {testCase.pre_conditions || '—'}
          </p>
          <p>
            <strong>Post-conditions:</strong> {testCase.post_conditions || '—'}
          </p>
          <p>
            <strong>Assigned:</strong> {testCase.assigned_to_name || 'Unassigned'}
          </p>
          <p>
            <strong>Suites:</strong>{' '}
            {suites.length ? suites.map((s) => s.name).join(', ') : 'None'}
          </p>

          <h4>Steps</h4>
          <ol className="steps">
            {steps.map((s) => (
              <li key={s.id}>
                <strong>{s.action}</strong>
                <span className="muted"> → {s.expected_result}</span>
              </li>
            ))}
            {!steps.length && <li className="muted">No steps defined</li>}
          </ol>
        </section>

        <section className="panel">
          <h3>Execute</h3>
          {!permissions.execute ? (
            <p className="muted">Your role is read-only. Execution is disabled.</p>
          ) : (
            <form onSubmit={execute} className="form-grid single">
              <label>
                Result
                <select value={result} onChange={(e) => setResult(e.target.value)}>
                  {['Pass', 'Fail', 'Blocked', 'Skipped'].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label>
                Comments
                <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} />
              </label>
              {result === 'Fail' && (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={createDefect}
                    onChange={(e) => setCreateDefect(e.target.checked)}
                  />
                  Create defect from failure
                </label>
              )}
              <button type="submit" className="btn primary" disabled={!permissions.execute}>
                Record result
              </button>
            </form>
          )}

          <button
            type="button"
            className="btn soft"
            onClick={() => setShowHistory((v) => !v)}
            style={{ marginTop: '1rem' }}
          >
            {showHistory ? 'Hide' : 'Show'} execution history
          </button>

          {showHistory && (
            <Suspense fallback={<div className="spinner" />}>
              <HistoryPanel testCaseId={id} />
            </Suspense>
          )}
        </section>
      </div>
    </div>
  );
}
