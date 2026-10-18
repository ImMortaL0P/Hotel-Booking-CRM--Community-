import { toast } from 'sonner';
import { clearSnapshot } from './dataCache';

// Use local vite proxy during development, use production URL when deployed
export const API_BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || 'https://sharda-crm.onrender.com');

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

interface ApiFetchOptions {
  /** Background calls (sync polling): no "waking up" / error toasts */
  quiet?: boolean;
  /** Request timeout in ms (default 30000) */
  timeoutMs?: number;
}

export async function apiFetch(endpoint: string, options: RequestInit = {}, { quiet = false, timeoutMs = 30000 }: ApiFetchOptions = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // Configurable timeout for network requests
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const token = localStorage.getItem('token');

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      },
      signal: controller.signal
    });

    clearTimeout(id);

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/verify')) {
        // Do not force-redirect if running on local offline synthetic token
        if (!token?.startsWith('mock-token-')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Don't leave the last user's data cached in the browser
          await clearSnapshot().catch(() => {});
          // Only redirect if not already on the login or public pages to avoid hard-refresh loop
          const path = window.location.pathname;
          if (path !== '/' && path !== '/login' && !path.startsWith('/book') && !path.startsWith('/reserve')) {
            window.location.href = '/';
          }
        }
      }
      // Prefer the server's explanation ("Expense validation failed: ...") over the bare status
      const body = await response.json().catch(() => null);
      const detail = body?.error || body?.message;
      throw new ApiError(detail ? String(detail) : `API error: ${response.status} ${response.statusText}`, response.status);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(id);

    if (!quiet) {
      if (error.name === 'AbortError') {
        toast.error('Request timed out. Please check your connection and try again.');
      } else {
        toast.error(error.message || 'Network error occurred');
      }
    }
    throw error;
  }
}
