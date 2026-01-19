export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(`/api${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Request failed');
  }

  return response;
}

export async function apiRequestJson<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await apiRequest(url, options);
  return response.json();
}
