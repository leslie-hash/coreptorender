/**
 * API utility functions for making requests to the backend
 */

/**
 * Get the full API URL for a given endpoint
 * @param endpoint - The API endpoint path (e.g., '/api/login', '/api/notifications')
 * @returns The full URL including the backend base URL
 */
export function getApiUrl(endpoint: string): string {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  // Remove trailing slash from apiUrl if present
  const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  // Ensure endpoint starts with /
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${path}`;
}

/**
 * Make a fetch request to the backend API
 * @param endpoint - The API endpoint path
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Promise with the fetch response
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = getApiUrl(endpoint);
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  
  return fetch(url, { ...defaultOptions, ...options });
}
