import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useProject } from '../context/ProjectContext';

export default function Layout() {
  const { user, logout, permissions } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { projects, currentProject, selectProject } = useProject();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">TC</span>
          <div>
            <strong>TestCase Hub</strong>
            <small>Quality at scale</small>
          </div>
        </div>

        <div className="project-picker">
          <label htmlFor="project-select">Project</label>
          <select
            id="project-select"
            value={currentProject?.id || ''}
            onChange={(e) => {
              const p = projects.find((x) => String(x.id) === e.target.value);
              selectProject(p || null);
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <nav className="nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/test-cases">Test Cases</NavLink>
          <NavLink to="/suites">Suites</NavLink>
          <NavLink to="/executions">Executions</NavLink>
          <NavLink to="/defects">Defects</NavLink>
          {permissions.manageUsers && <NavLink to="/users">Users</NavLink>}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="avatar">{user?.full_name?.[0] || '?'}</span>
            <div>
              <strong>{user?.full_name}</strong>
              <small className="role-badge">{user?.role}</small>
            </div>
          </div>
          <button type="button" className="btn ghost" onClick={toggleTheme}>
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
          <button type="button" className="btn ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
