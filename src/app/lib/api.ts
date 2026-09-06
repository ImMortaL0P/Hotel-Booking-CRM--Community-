import { toast } from 'sonner';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  // Use local vite proxy during development, use production URL when deployed
  const baseUrl = import.meta.env.DEV 
    ? '' 
    : (import.meta.env.VITE_API_BASE_URL || 'https://sharda-crm.onrender.com');
  const url = `${baseUrl}${endpoint}`;
  
  // Timeout for long requests
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 120000); // 120 second timeout for cold starts
  
  // Try counting how long it takes to warn if sleeping
  const startTime = Date.now();
  let toastId = null;
  const slowWarning = setTimeout(() => {
    toastId = toast.loading('Waking up the server (this may take up to 60+ seconds)...');
  }, 8000);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal
    });
    
    clearTimeout(slowWarning);
    clearTimeout(id);
    if (toastId) toast.dismiss(toastId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error: any) {
    clearTimeout(slowWarning);
    clearTimeout(id);
    if (toastId) toast.dismiss(toastId);
    
    if (error.name === 'AbortError') {
      toast.error('Server is taking too long to respond. Please try again.');
    } else {
      toast.error(error.message || 'Network error occurred');
    }
    throw error;
  }
}
