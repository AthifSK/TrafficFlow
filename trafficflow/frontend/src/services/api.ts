// API service layer – all backend calls go through here
import axios from 'axios';

// Determine API base URL:
// 1. Explicit Vite environment variable (VITE_API_URL) if specified
// 2. Bound service environment variable (BACKEND_URL) injected by Vercel Services
// 3. Relative URL (empty string) for browser SPA so requests to /api route via Vercel rewrites or Vite proxy
const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const globalProcess = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })?.process;
  if (globalProcess?.env?.BACKEND_URL) {
    return globalProcess.env.BACKEND_URL;
  }
  return '';
};

const API_BASE = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
});

export default api;

// --- Upload ---
export const uploadCSV = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/api/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// --- Dataset ---
export const getDatasetPreview = () => api.get('/api/dataset/preview');
export const validateDataset = (colMap: Record<string, string>) =>
  api.post('/api/dataset/validate', { col_map: colMap });
export const updateColMap = (colMap: Record<string, string>) =>
  api.post('/api/dataset/colmap', { col_map: colMap });

// --- Preprocess ---
export const runPreprocess = () => api.post('/api/preprocess');
export const getPreprocessReport = () => api.get('/api/preprocess/report');
export const getPreprocessPreview = () => api.get('/api/preprocess/preview');

// --- Features ---
export const runFeatureExtraction = () => api.post('/api/features/extract');
export const getFeaturesPreview = () => api.get('/api/features/preview');

// --- Model ---
export interface TrainParams {
  algorithm: 'kmeans' | 'dbscan' | 'both';
  kmeans?: { n_clusters: number; random_state: number };
  dbscan?: { eps: number; min_samples: number };
}
export const trainModel = (params: TrainParams) => api.post('/api/model/train', params);
export const compareModels = () => api.post('/api/model/compare');
export const clusterNew = () => api.post('/api/model/cluster');

// --- Results ---
export const getResultsSummary = (algo = 'kmeans') =>
  api.get('/api/results/summary', { params: { algo } });
export const getResultsClusters = (algo = 'kmeans') =>
  api.get('/api/results/clusters', { params: { algo } });
export const getResultsTrajectories = (algo = 'kmeans', clusterId?: number) =>
  api.get('/api/results/trajectories', { params: { algo, cluster_id: clusterId } });
export const getResultsMap = (algo = 'kmeans') =>
  api.get('/api/results/map', { params: { algo } });
export const downloadResults = (algo: string, fileType: string) =>
  api.get('/api/results/download', {
    params: { algo, file_type: fileType },
    responseType: 'blob',
  });
