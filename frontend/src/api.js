const TOKEN_KEY = "jt_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, { method = "GET", body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = new URLSearchParams(form);
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  } else if (body) {
    payload = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`/api${path}`, { method, headers, body: payload });

  if (res.status === 401 && token) {
    clearToken();
    window.dispatchEvent(new Event("jt-logout"));
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data.detail === "string") detail = data.detail;
      else if (Array.isArray(data.detail)) detail = data.detail.map((d) => d.msg).join(", ");
    } catch {}
    throw new Error(detail);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  register: (email, password) => request("/auth/register", { method: "POST", body: { email, password } }),
  login: async (email, password) => {
    const data = await request("/auth/login", { method: "POST", form: { username: email, password } });
    setToken(data.access_token);
  },
  me: () => request("/auth/me"),
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/applications${qs ? `?${qs}` : ""}`);
  },
  create: (data) => request("/applications", { method: "POST", body: data }),
  update: (id, data) => request(`/applications/${id}`, { method: "PATCH", body: data }),
  remove: (id) => request(`/applications/${id}`, { method: "DELETE" }),
  stats: () => request("/stats"),
};
