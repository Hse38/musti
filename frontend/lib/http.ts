import { API_BASE } from "@/lib/constants";

type TokenKind = "participant" | "admin";

function accessKey(kind: TokenKind): string {
  return kind === "participant" ? "pf_access_token" : "admin_access_token";
}

function refreshKey(kind: TokenKind): string {
  return kind === "participant" ? "pf_refresh_token" : "admin_refresh_token";
}

async function refreshToken(kind: TokenKind): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const r = localStorage.getItem(refreshKey(kind));
  if (!r) return null;
  const res = await fetch(`${API_BASE}/auth/jwt/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: r }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.access) {
    localStorage.setItem(accessKey(kind), data.access);
    return data.access as string;
  }
  return null;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  kind: TokenKind = "participant",
  retry = true
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (typeof window !== "undefined") {
    const t = localStorage.getItem(accessKey(kind));
    if (t) headers.set("Authorization", `Bearer ${t}`);
  }
  let res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401 && retry && typeof window !== "undefined") {
    const next = await refreshToken(kind);
    if (next) {
      headers.set("Authorization", `Bearer ${next}`);
      res = await fetch(`${API_BASE}${path}`, { ...init, headers });
    }
  }
  return res;
}
