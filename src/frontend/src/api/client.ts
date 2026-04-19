import axios, { type AxiosError } from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string || 'http://localhost:8080',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && 
        !error.config?.url?.includes('/api/auth/login') &&
        !error.config?.url?.includes('/api/me/password')) {
      console.error('[api] 401 Unauthorized - redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (error.response && error.response.status >= 500) {
      console.error('[api] Server error', error.response.status, error.response.data);
    } else if (!error.response) {
      console.error('[api] Network error or timeout', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
