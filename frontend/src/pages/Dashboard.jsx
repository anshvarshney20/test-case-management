import { useEffect, useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import api from '../api/client';
import { useProject } from '../context/ProjectContext';

const STATUS_COLORS = {
  Pass: '#2a9d6e',
  Fail: '#d64545',
  Blocked: '#d97706',
  Skipped: '#6b7280',
  Pending: '#3b82f6',
};

export default function Dashboard() {
  const { currentProject } = useProject();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentProject) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .get('/analytics/dashboard', { params: { projectId: currentProject.id } })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || 'Failed to load analytics');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentProject]);

  const statusPie = useMemo(() => {
    if (!data?.summary) return [];
    const s = data.summary;
    return [
      { name: 'Pass', value: s.passed || 0 },
      { name: 'Fail', value: s.failed || 0 },
      { name: 'Blocked', value: s.blocked || 0 },
      { name: 'Skipped', value: s.skipped || 0 },
      { name: 'Pending', value: s.pending || 0 },
    ].filter((x) => x.value > 0);
  }, [data]);

  const trendData = useMemo(
    () =>
      (data?.trends || []).map((t) => ({
        day: String(t.day).slice(5, 10),
        passed: t.passed,
        failed: t.failed,
        total: t.total,
      })),
    [data]
  );

  const priorityBars = useMemo(
    () =>
      (data?.passFailByPriority || []).map((r) => ({
        priority: r.priority,
        passed: r.passed,
        failed: r.failed,
      })),
    [data]
  );

  if (!currentProject) {
    return (
      <div className="page">
        <h1>Dashboard</h1>
        <p className="muted">Select or create a project to view analytics.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">
            {currentProject.name} · v{currentProject.version}
            {data?.cached ? ' · served from cache' : ''}
          </p>
        </div>
        {data?.cacheStats && (
          <div className="cache-pill">
            Cache: {data.cacheStats.backend}
            {data.cached ? ' hit' : ' miss'}
          </div>
        )}
      </header>

      {error && <div className="alert error">{error}</div>}
      {loading && !data && (
        <div className="page-loader">
          <div className="spinner" />
        </div>
      )}

      {data && (
        <>
          <div className="stat-grid">
            <div className="stat">
              <span>Total cases</span>
              <strong>{data.summary.total_cases}</strong>
            </div>
            <div className="stat">
              <span>Pass rate</span>
              <strong>{data.summary.passRate}%</strong>
            </div>
            <div className="stat">
              <span>Coverage</span>
              <strong>{data.summary.coverage}%</strong>
            </div>
            <div className="stat">
              <span>Defect density</span>
              <strong>{data.summary.defectDensity}%</strong>
            </div>
            <div className="stat pass">
              <span>Passed</span>
              <strong>{data.summary.passed}</strong>
            </div>
            <div className="stat fail">
              <span>Failed</span>
              <strong>{data.summary.failed}</strong>
            </div>
            <div className="stat">
              <span>Blocked</span>
              <strong>{data.summary.blocked}</strong>
            </div>
            <div className="stat">
              <span>Pending</span>
              <strong>{data.summary.pending}</strong>
            </div>
          </div>

          <div className="chart-grid">
            <section className="panel">
              <h3>Status distribution</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" outerRadius={90} label>
                    {statusPie.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </section>

            <section className="panel">
              <h3>Execution trends (14 days)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="passed" stroke="#2a9d6e" strokeWidth={2} />
                  <Line type="monotone" dataKey="failed" stroke="#d64545" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </section>

            <section className="panel">
              <h3>Pass / Fail by priority</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={priorityBars}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="priority" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="passed" fill="#2a9d6e" />
                  <Bar dataKey="failed" fill="#d64545" />
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section className="panel">
              <h3>Progress by tester</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tester</th>
                      <th>Runs</th>
                      <th>Passed</th>
                      <th>Failed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.byTester || []).map((t) => (
                      <tr key={t.id}>
                        <td>{t.full_name}</td>
                        <td>{t.total}</td>
                        <td>{t.passed}</td>
                        <td>{t.failed}</td>
                      </tr>
                    ))}
                    {!data.byTester?.length && (
                      <tr>
                        <td colSpan={4} className="muted">
                          No executions yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="muted small">
                Open defects: {data.defects?.open_defects ?? 0} / {data.defects?.total_defects ?? 0}{' '}
                total · Critical: {data.defects?.critical ?? 0}
              </p>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
