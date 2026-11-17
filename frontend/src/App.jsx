import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const TestCases = lazy(() => import('./pages/TestCases'));
const TestCaseDetail = lazy(() => import('./pages/TestCaseDetail'));
const Suites = lazy(() => import('./pages/Suites'));
const SuiteDetail = lazy(() => import('./pages/SuiteDetail'));
const Executions = lazy(() => import('./pages/Executions'));
const Users = lazy(() => import('./pages/Users'));
const Defects = lazy(() => import('./pages/Defects'));

function PageLoader() {
  return (
    <div className="page-loader">
      <div className="spinner" />
      <p>Loading…</p>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="test-cases" element={<TestCases />} />
          <Route path="test-cases/:id" element={<TestCaseDetail />} />
          <Route path="suites" element={<Suites />} />
          <Route path="suites/:id" element={<SuiteDetail />} />
          <Route path="executions" element={<Executions />} />
          <Route path="defects" element={<Defects />} />
          <Route
            path="users"
            element={
              <ProtectedRoute roles={['admin']}>
                <Users />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
