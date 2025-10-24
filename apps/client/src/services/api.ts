import axios from 'axios';

// URL base do nosso backend (apps/server)
const API_URL = 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para adicionar o token em *todas* as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rpg-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});