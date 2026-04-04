export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setTokens(access: string, refresh?: string) {
  localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

async function refreshAccess(): Promise<string | null> {
  const r = localStorage.getItem("refresh_token");
  if (!r) return null;
  const res = await fetch(`${API_BASE}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: r }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.access) {
    localStorage.setItem("access_token", data.access);
    return data.access as string;
  }
  return null;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  auth = false
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (auth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  let res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (auth && res.status === 401) {
    const newTok = await refreshAccess();
    if (newTok) {
      headers.set("Authorization", `Bearer ${newTok}`);
      res = await fetch(`${API_BASE}${path}`, { ...init, headers });
    }
  }
  return res;
}
