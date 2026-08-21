import api from './api';

export const createProject = async (projectData) => {
  return api.post('/projects/', projectData);
};

export const getProjects = async () => {
  return api.get('/projects/');
};

export const getProjectById = async (id) => {
  return api.get(`/projects/${id}`);
};

export const updateProject = async (id, projectData) => {
  return api.put(`/projects/${id}`, projectData);
};
