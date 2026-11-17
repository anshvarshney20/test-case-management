import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMOS = [
  { label: 'Admin', email: 'admin@demo.com', password: 'Admin@123' },
  { label: 'Test Lead', email: 'lead@demo.com', password: 'Lead@123' },
  { label: 'Tester', email: 'tester@demo.com', password: 'Tester@123' },
  { label: 'Read-Only', email: 'readonly@demo.com', password: 'Read@123' },
];

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onChange = useCallback((e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }, []);

  const submit = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');
      setBusy(true);
      try {
        if (mode === 'login') await login(form.email, form.password);
        else await register(form);
        navigate('/');
      } catch (err) {
        setError(err.response?.data?.error || 'Authentication failed');
      } finally {
        setBusy(false);
      }
    },
    [mode, form, login, register, navigate]
  );

  const fillDemo = useCallback((demo) => {
    setForm({ email: demo.email, password: demo.password, full_name: '' });
    setMode('login');
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="auth-hero">
          <p className="eyebrow">TestCase Hub</p>
          <h1>Ship quality with confidence.</h1>
          <p className="lede">
            Plan suites, execute runs, and watch pass rates move — all with role-aware access.
          </p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
          {error && <div className="alert error">{error}</div>}

          {mode === 'register' && (
            <label>
              Full name
              <input name="full_name" value={form.full_name} onChange={onChange} required />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              required
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              required
              autoComplete="current-password"
            />
          </label>

          <button type="submit" className="btn primary block" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}
          </button>

          <button
            type="button"
            className="btn ghost block"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
          </button>

          <div className="demo-grid">
            <p>Quick demo logins</p>
            {DEMOS.map((d) => (
              <button key={d.label} type="button" className="btn soft" onClick={() => fillDemo(d)}>
                {d.label}
              </button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}
