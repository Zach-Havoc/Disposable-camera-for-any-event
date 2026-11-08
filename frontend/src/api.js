const BASE = import.meta.env.VITE_API_URL || ''

export function api(path, opts = {}) {
  return fetch(`${BASE}${path}`, {
    ...opts,
    credentials: 'include',
    headers: {
      ...opts.headers,
      'ngrok-skip-browser-warning': 'true',
    },
  })
}
