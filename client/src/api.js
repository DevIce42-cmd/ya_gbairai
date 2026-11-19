const GUEST_KEY = 'ya_gbairai_guest_id';
const ADMIN_KEY_STORAGE = 'ya_gbairai_admin_key';

export function getGuestId() {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = 'gb_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

export function getSavedAdminKey() {
  return sessionStorage.getItem(ADMIN_KEY_STORAGE) || '';
}

export function setSavedAdminKey(key) {
  if (key) sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
  else sessionStorage.removeItem(ADMIN_KEY_STORAGE);
}

async function request(path, { method = 'GET', body, adminKey } = {}) {
  const headers = { 'X-Guest-Id': getGuestId() };
  const key = adminKey ?? getSavedAdminKey();
  if (key) headers['X-Admin-Key'] = key;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api/v1${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await res.json().catch(() => ({
    ok: false,
    error: { message: 'Réponse serveur invalide.' },
  }));

  if (!res.ok || !payload.ok) {
    throw new Error(payload?.error?.message || 'Une erreur est survenue.');
  }
  return payload;
}

export const api = {
  getMeta: () => request('/meta').then((r) => r.data),
  getAlias: () => request('/alias').then((r) => r.data.alias),
  listPosts: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
    return request(`/posts?${qs.toString()}`).then((r) => r.data);
  },
  getPost: (id) => request(`/posts/${encodeURIComponent(id)}`).then((r) => r.data),
  createPost: (data) => request('/posts', { method: 'POST', body: data }),
  addPart: (seriesId, data) =>
    request(`/series/${encodeURIComponent(seriesId)}/parts`, { method: 'POST', body: data }).then((r) => r.data),
  toggleReaction: (id, type) =>
    request(`/posts/${encodeURIComponent(id)}/reactions`, { method: 'POST', body: { type } }).then((r) => r.data),
  addComment: (id, data) =>
    request(`/posts/${encodeURIComponent(id)}/comments`, { method: 'POST', body: data }).then((r) => r.data),
  reportPost: (id, data) =>
    request(`/posts/${encodeURIComponent(id)}/report`, { method: 'POST', body: data }).then((r) => r.data),
  deletePost: (id) => request(`/posts/${encodeURIComponent(id)}`, { method: 'DELETE' }).then((r) => r.data),
  getAdminDashboard: (adminKey) => request('/admin/dashboard', { adminKey }).then((r) => r.data),
  resolveReport: (id, action) =>
    request(`/admin/reports/${encodeURIComponent(id)}`, { method: 'PATCH', body: { action } }).then((r) => r.data),
  setPostStatus: (id, status) =>
    request(`/admin/posts/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } }).then((r) => r.data),
};
