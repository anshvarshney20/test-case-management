import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function SuiteDetail() {
  const { id } = useParams();
  const { permissions } = useAuth();
  const [suite, setSuite] = useState(null);
  const [cases, setCases] = useState([]);
  const [report, setReport] = useState(null);
  const [results, setResults] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get(`/suites/${id}`).then((res) => {
      setSuite(res.data.suite);
      setCases(res.data.testCases || []);
      const init = {};
      (res.data.testCases || []).forEach((c) => {
        init[c.id] = 'Pass';
      });
      setResults(init);
    });
    api.get(`/suites/${id}/report`).then((res) => setReport(res.data.report));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const runSuite = async () => {
    setError('');
    setMessage('');
    try {
      const payload = {
        suite_id: Number(id),
        results: cases.map((c) => ({
          test_case_id: c.id,
          result: results[c.id] || 'Pass',
          comments: 'Suite run',
        })),
      };
      const res = await api.post('/testexecutions/suite', payload);
      setMessage(`Recorded ${res.data.count} executions.`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Suite run failed');
    }
  };

  if (!suite) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <Link to="/suites" className="muted">
            ← Suites
          </Link>
          <h1>{suite.name}</h1>
          <p className="muted">{suite.description}</p>
        </div>
        {permissions.execute && (
          <button type="button" className="btn primary" onClick={runSuite} disabled={!cases.length}>
            Execute suite
          </button>
        )}
      </header>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      {report && (
        <div className="stat-grid compact">
          <div className="stat">
            <span>Cases</span>
            <strong>{report.total_cases}</strong>
          </div>
          <div className="stat pass">
            <span>Latest Pass</span>
            <strong>{report.passed}</strong>
          </div>
          <div className="stat fail">
            <span>Latest Fail</span>
            <strong>{report.failed}</strong>
          </div>
          <div className="stat">
            <span>Blocked</span>
            <strong>{report.blocked}</strong>
          </div>
        </div>
      )}

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Case</th>
              <th>Priority</th>
              <th>Last result</th>
              {permissions.execute && <th>Run as</th>}
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/test-cases/${c.id}`}>{c.title}</Link>
                </td>
                <td>
                  <span className={`prio ${c.priority}`}>{c.priority}</span>
                </td>
                <td>
                  {c.last_result ? (
                    <span className={`result ${c.last_result}`}>{c.last_result}</span>
                  ) : (
                    '—'
                  )}
                </td>
                {permissions.execute && (
                  <td>
                    <select
                      value={results[c.id] || 'Pass'}
                      onChange={(e) =>
                        setResults((r) => ({ ...r, [c.id]: e.target.value }))
                      }
                    >
                      {['Pass', 'Fail', 'Blocked', 'Skipped'].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </td>
                )}
              </tr>
            ))}
            {!cases.length && (
              <tr>
                <td colSpan={4} className="muted">
                  No cases in this suite. Add them from Test Cases bulk actions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
