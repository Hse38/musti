"use client";

const PF_ACCESS = "pf_access_token";
const PF_REFRESH = "pf_refresh_token";
const AD_ACCESS = "admin_access_token";
const AD_REFRESH = "admin_refresh_token";

export function setParticipantTokens(access: string, refresh?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PF_ACCESS, access);
  if (refresh) localStorage.setItem(PF_REFRESH, refresh);
}

export function clearParticipantTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PF_ACCESS);
  localStorage.removeItem(PF_REFRESH);
}

export function getParticipantAccess(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PF_ACCESS);
}

export function getParticipantRefresh(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PF_REFRESH);
}

export function setAdminTokens(access: string, refresh?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AD_ACCESS, access);
  if (refresh) localStorage.setItem(AD_REFRESH, refresh);
}

export function clearAdminTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AD_ACCESS);
  localStorage.removeItem(AD_REFRESH);
}

export function getAdminAccess(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AD_ACCESS);
}

export function getAdminRefresh(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AD_REFRESH);
}
