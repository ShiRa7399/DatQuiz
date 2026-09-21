import axios from 'axios';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal ? 'http://localhost:5000/api' : 'https://datquiz.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

// Interceptor for auth header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('faculty_token') || 'token_faculty_1';
  config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
