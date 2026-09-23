// A thin wrapper around fetch(), matching the backend's response shape:
// { success: true, data } on success, { success: false, message } on error.
// Centralizing this means every page just calls e.g. api.get('/leave-types')
// and gets back `data` directly, or a thrown Error with a useful message.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('leave_mis_token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // The backend always returns JSON, even for errors, so we can parse
  // first and decide what to do based on res.ok + the parsed body.
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    // A 401 anywhere (other than the login call itself) means the
    // token is missing/expired - clear it so the UI falls back to the
    // login screen instead of showing a broken authenticated view.
    if (res.status === 401 && auth) {
      localStorage.removeItem('leave_mis_token');
      localStorage.removeItem('leave_mis_user');
    }
    throw new Error(json.message || `Request failed (${res.status})`);
  }

  return json.data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, opts = {}) => request(path, { method: 'POST', body, ...opts }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
};
