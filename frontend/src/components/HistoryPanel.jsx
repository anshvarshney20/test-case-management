import { useEffect, useState } from 'react';
import api from '../api/client';

export default function HistoryPanel({ testCaseId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/testexecutions/history/${testCaseId}`)
      .then((res) => setHistory(res.data.history || []))
      .finally(() => setLoading(false));
  }, [testCaseId]);

  if (loading) return <div className="spinner" />;

  return (
    <div className="history-list">
      {history.map((h) => (
        <div key={h.id} className="history-item">
          <span className={`result ${h.result}`}>{h.result}</span>
          <div>
            <strong>{h.executed_by_name || 'Unknown'}</strong>
            <small>{new Date(h.executed_at).toLocaleString()}</small>
            {h.comments && <p>{h.comments}</p>}
          </div>
        </div>
      ))}
      {!history.length && <p className="muted">No executions yet.</p>}
    </div>
  );
}
