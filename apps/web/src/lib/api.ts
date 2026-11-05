export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errBody: ApiError;
    try {
      errBody = await response.json();
    } catch {
      errBody = {
        code: `HTTP_${response.status}`,
        message: response.statusText || 'An unexpected error occurred',
      };
    }
    throw errBody;
  }

  // Handle file or empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    return (await response.text()) as unknown as T;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
