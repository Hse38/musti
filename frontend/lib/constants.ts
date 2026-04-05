export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://musti-production.up.railway.app/api/v1";

export const WS_ORIGIN =
  process.env.NEXT_PUBLIC_WS_URL ??
  "wss://musti-production.up.railway.app";

export const ADMIN_WS_PATH = "/ws/admin/notifications/";
