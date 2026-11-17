import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useProject } from '../context/ProjectContext';

export default function Defects() {
  const { currentProject } = useProject();
  const [defects, setDefects] = useState([]);

  useEffect(() => {
    if (!currentProject) return;
    api
      .get('/testexecutions/defects', { params: { projectId: currentProject.id } })
      .then((res) => setDefects(res.data.defects || []));
  }, [currentProject]);

  if (!currentProject) {
    return (
      <div className="page">
        <h1>Defects</h1>
        <p className="muted">Select a project first.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Defects</h1>
          <p className="muted">Bugs filed from failed executions.</p>
        </div>
      </header>

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Case</th>
              <th>Reporter</th>
            </tr>
          </thead>
          <tbody>
            {defects.map((d) => (
              <tr key={d.id}>
                <td>#{d.id}</td>
                <td>{d.title}</td>
                <td>
                  <span className={`prio ${d.severity}`}>{d.severity}</span>
                </td>
                <td>{d.status}</td>
                <td>
                  {d.test_case_id ? (
                    <Link to={`/test-cases/${d.test_case_id}`}>{d.test_case_title}</Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{d.reported_by_name}</td>
              </tr>
            ))}
            {!defects.length && (
              <tr>
                <td colSpan={6} className="muted">
                  No defects yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
