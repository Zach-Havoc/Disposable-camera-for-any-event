const BASE = import.meta.env.VITE_API_URL || ''

export function api(path, opts = {}) {
  const token = localStorage.getItem('organizer_token')
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      ...opts.headers,
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}
