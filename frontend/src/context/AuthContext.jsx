import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

const PERMISSIONS = {
  admin: {
    manageUsers: true,
    manageProjects: true,
    manageTestCases: true,
    manageSuites: true,
    execute: true,
    createDefects: true,
    viewReports: true,
  },
  'test-lead': {
    manageUsers: false,
    manageProjects: true,
    manageTestCases: true,
    manageSuites: true,
    execute: true,
    createDefects: true,
    viewReports: true,
  },
  tester: {
    manageUsers: false,
    manageProjects: false,
    manageTestCases: false,
    manageSuites: false,
    execute: true,
    createDefects: true,
    viewReports: true,
  },
  'read-only': {
    manageUsers: false,
    manageProjects: false,
    manageTestCases: false,
    manageSuites: false,
    execute: false,
    createDefects: false,
    viewReports: true,
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tcm_user'));
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('tcm_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem('tcm_user', JSON.stringify(res.data.user));
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem('tcm_token');
        localStorage.removeItem('tcm_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('tcm_token', res.data.token);
    localStorage.setItem('tcm_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await api.post('/auth/register', payload);
    localStorage.setItem('tcm_token', res.data.token);
    localStorage.setItem('tcm_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('tcm_token');
    localStorage.removeItem('tcm_user');
    setUser(null);
  }, []);

  const permissions = useMemo(
    () => PERMISSIONS[user?.role] || PERMISSIONS['read-only'],
    [user?.role]
  );

  const value = useMemo(
    () => ({ user, loading, login, register, logout, permissions, isAuthenticated: !!user }),
    [user, loading, login, register, logout, permissions]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
