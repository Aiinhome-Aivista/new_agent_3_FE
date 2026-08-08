import axios from 'axios';

const API_BASE_URL = 'http://localhost:3011/api';

export const createProject = async (projectData) => {
  return axios.post(`${API_BASE_URL}/projects/`, projectData);
};

export const getProjects = async () => {
  return axios.get(`${API_BASE_URL}/projects/`);
};

export const getProjectById = async (id) => {
  return axios.get(`${API_BASE_URL}/projects/${id}`);
};

export const updateProject = async (id, projectData) => {
  return axios.put(`${API_BASE_URL}/projects/${id}`, projectData);
};
