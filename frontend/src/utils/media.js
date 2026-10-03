export function resolveApiUrl(path, fallback = null) {
  if (!path) return fallback;
  if (path.startsWith('http') || path.startsWith('data:')) return path;

  const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
