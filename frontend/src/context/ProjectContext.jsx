import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshProjects = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await api.get('/projects');
      setProjects(res.data.projects || []);
      setCurrentProject((prev) => {
        if (prev) {
          const still = res.data.projects.find((p) => p.id === prev.id);
          if (still) return still;
        }
        const saved = localStorage.getItem('tcm_project');
        if (saved) {
          const found = res.data.projects.find((p) => String(p.id) === saved);
          if (found) return found;
        }
        return res.data.projects[0] || null;
      });
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) refreshProjects();
    else {
      setProjects([]);
      setCurrentProject(null);
    }
  }, [isAuthenticated, refreshProjects]);

  useEffect(() => {
    if (currentProject) localStorage.setItem('tcm_project', String(currentProject.id));
  }, [currentProject]);

  const selectProject = useCallback((project) => setCurrentProject(project), []);

  const value = useMemo(
    () => ({ projects, currentProject, selectProject, refreshProjects, loading }),
    [projects, currentProject, selectProject, refreshProjects, loading]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
};
