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
}

export async function apiFetch(endpoint: string, options: RequestInit = {}, { quiet = false }: ApiFetchOptions = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // Timeout for long requests
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 120000); // 120 second timeout for cold starts

  // Warn if the (free-tier) server is still waking up
  let toastId: string | number | null = null;
  const slowWarning = quiet ? undefined : setTimeout(() => {
    toastId = toast.loading('Waking up the server (this may take up to 60+ seconds)...');
  }, 8000);

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

    clearTimeout(slowWarning);
    clearTimeout(id);
    if (toastId) toast.dismiss(toastId);

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Don't leave the last user's data cached in the browser
        await clearSnapshot().catch(() => {});
        window.location.href = '/';
      }
      // Prefer the server's explanation ("Expense validation failed: ...") over the bare status
      const body = await response.json().catch(() => null);
      const detail = body?.error || body?.message;
      throw new ApiError(detail ? String(detail) : `API error: ${response.status} ${response.statusText}`, response.status);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(slowWarning);
    clearTimeout(id);
    if (toastId) toast.dismiss(toastId);

    if (!quiet) {
      if (error.name === 'AbortError') {
        toast.error('Server is taking too long to respond. Please try again.');
      } else {
        toast.error(error.message || 'Network error occurred');
      }
    }
    throw error;
  }
}
