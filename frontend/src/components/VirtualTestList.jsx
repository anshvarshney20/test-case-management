import { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Link } from 'react-router-dom';

const ROW_HEIGHT = 64;

export default function VirtualTestList({ items, selected, onToggle, canManage }) {
  const Row = useCallback(
    ({ index, style }) => {
      const tc = items[index];
      return (
        <div style={style} className="vtable-row">
          {canManage && (
            <input
              type="checkbox"
              checked={selected.has(tc.id)}
              onChange={() => onToggle(tc.id)}
            />
          )}
          <div className="vtable-main">
            <Link to={`/test-cases/${tc.id}`}>{tc.title}</Link>
            <div className="meta-row">
              <span className={`prio ${tc.priority}`}>{tc.priority}</span>
              <span>{tc.type}</span>
              {tc.last_result && <span className={`result ${tc.last_result}`}>{tc.last_result}</span>}
              {tc.assigned_to_name && <span>{tc.assigned_to_name}</span>}
            </div>
          </div>
        </div>
      );
    },
    [items, selected, onToggle, canManage]
  );

  const height = useMemo(() => Math.min(560, Math.max(ROW_HEIGHT * 4, items.length * ROW_HEIGHT)), [items.length]);

  if (!items.length) return <p className="muted">No test cases match your filters.</p>;

  return (
    <List height={height} itemCount={items.length} itemSize={ROW_HEIGHT} width="100%" className="vtable">
      {Row}
    </List>
  );
}
