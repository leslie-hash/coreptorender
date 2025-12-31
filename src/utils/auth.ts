import { getApiUrl } from './api';

export const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };
  
  const fullUrl = getApiUrl(url);
  
  return fetch(fullUrl, {
    ...options,
    credentials: 'include',
    headers,
  });
};
