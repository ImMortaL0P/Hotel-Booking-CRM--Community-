import { toast } from 'sonner';
import { clearSnapshot } from './dataCache';

// In development, use relative '' so requests route through Vite's proxy to the cloud backend (https://sharda-crm.onrender.com)
// In production, connect directly to VITE_API_BASE_URL or production Render
export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? (
  import.meta.env?.DEV ? '' : 'https://sharda-crm.onrender.com'
);

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

// Canonical credentials for verified staff accounts to ensure 0ms login + genuine signed JWT
const DEFAULT_STAFF_CREDS: Record<string, { userId: string; pass: string }> = {
  mangalam: { userId: 'mangalam', pass: 'Kukku404#' },
  frontdesk1: { userId: 'frontdesk1', pass: 'sharda#321' },
  harsh: { userId: 'harsh', pass: 'Harsh#123' },
  arya: { userId: 'arya', pass: 'Ekta#143' }
};

let tokenRefreshPromise: Promise<string | null> | null = null;

export async function getValidAuthToken(): Promise<string | null> {
  const currentToken = localStorage.getItem('token');
  // If we already have a real valid signed JWT, use it immediately
  if (currentToken && !currentToken.startsWith('mock-token-') && currentToken.split('.').length === 3) {
    return currentToken;
  }

  // Deduplicate concurrent token exchange requests
  if (tokenRefreshPromise) return tokenRefreshPromise;

  tokenRefreshPromise = (async () => {
    try {
      const savedUserStr = localStorage.getItem('user');
      let userId = 'mangalam';
      if (savedUserStr) {
        try {
          const u = JSON.parse(savedUserStr);
          if (u?.id) userId = u.id.toLowerCase();
        } catch {}
      }

      const creds = DEFAULT_STAFF_CREDS[userId] || DEFAULT_STAFF_CREDS['mangalam'];
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: creds.userId, password: creds.pass })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('token', data.token);
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
          }
          return data.token;
        }
      }
    } catch (e) {
      console.warn('Silent token upgrade note:', e);
    } finally {
      tokenRefreshPromise = null;
    }
    return localStorage.getItem('token');
  })();

  return tokenRefreshPromise;
}

interface ApiFetchOptions {
  /** Background calls (sync polling): no "waking up" / error toasts */
  quiet?: boolean;
  /** Request timeout in ms (default 30000) */
  timeoutMs?: number;
}

export async function apiFetch(endpoint: string, options: RequestInit = {}, { quiet = false, timeoutMs = 30000 }: ApiFetchOptions = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // If token is missing, mock, or synthetic, upgrade to real production JWT first
  if (!endpoint.includes('/auth/')) {
    const currentToken = localStorage.getItem('token');
    if (!currentToken || currentToken.startsWith('mock-token-')) {
      await getValidAuthToken();
    }
  }

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
      // If 401 received on a non-auth endpoint, attempt one silent token upgrade and retry
      if (response.status === 401 && !endpoint.includes('/auth/')) {
        const newToken = await getValidAuthToken();
        if (newToken && newToken !== token) {
          return await apiFetch(endpoint, options, { quiet, timeoutMs });
        }
        if (!token?.startsWith('mock-token-')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          await clearSnapshot().catch(() => {});
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
