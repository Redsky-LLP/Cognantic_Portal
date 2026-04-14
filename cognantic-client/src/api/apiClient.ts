// src/services/apiClient.ts

// 🛡️ Hardcoding it bypasses the .env file completely!
// ✅ NEW
const BASE_URL = import.meta.env.VITE_API_URL || 'https://cognantic-api-7ob3.onrender.com/api/v1';

let _token: string | null = localStorage.getItem('cognantic_token');

export const setToken = (t: string) => {
  _token = t;
  localStorage.setItem('cognantic_token', t);
};

export const clearToken = () => {
  _token = null;
  localStorage.removeItem('cognantic_token');
};

export const getToken = () => _token;

export interface BackendResult<T> {
  isSuccess: boolean;
  data: T | null;
  error: string | null;
  message: string | null;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: options.method ?? 'GET',
    body: options.body,
    headers,
  });

  const text = await res.text();
  let parsed: BackendResult<T> | null = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    console.error('[apiClient] Non-JSON response:', text);
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  if (!res.ok) {
    const msg = parsed?.error ?? parsed?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }

  if (parsed && parsed.isSuccess === false) {
    throw new Error(parsed.error ?? 'Request failed');
  }

  // Auto-unwraps C# Result<T>.data for your views!
  return (parsed?.data ?? parsed) as T; 
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

export default apiClient;