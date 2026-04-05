"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ADMIN_WS_PATH, WS_ORIGIN } from "@/lib/constants";
import { apiFetch } from "@/lib/http";
import { getAdminAccess } from "@/lib/auth-tokens";

const DASH_KEYS: { key: string; labelKey: string }[] = [
  { key: "participants_total", labelKey: "participantsTotal" },
  { key: "participants_logged_in", labelKey: "participantsLoggedIn" },
  { key: "transport_plane", labelKey: "transportPlane" },
  { key: "transport_bus_train", labelKey: "transportBusTrain" },
  { key: "invoices_approved", labelKey: "cardApprovedInvoices" },
  { key: "invoices_pending", labelKey: "invoicesPending" },
];

function formatWsPayload(raw: string): string {
  try {
    const o = JSON.parse(raw) as { type?: string; data?: Record<string, unknown> };
    const d = o.data || {};
    const t = o.type || "event";
    if (t === "new_invoice") {
      return `Yeni fatura #${d.invoice_id} — ${d.participant_name ?? ""} (${d.team_name ?? ""})`;
    }
    if (t === "participant_login") {
      return `Giriş: ${d.participant_name ?? ""} — ${d.team_name ?? ""}`;
    }
    if (t === "faq_escalation") {
      return `SSS eskalasyon: ${d.participant_name ?? ""} — ${String(d.question ?? "").slice(0, 80)}`;
    }
    if (t === "low_confidence") {
      return `Düşük güven fatura #${d.invoice_id}`;
    }
    if (t === "captain_upload") {
      return `Kaptan yükleme — ${d.participant_name ?? ""}`;
    }
    return `${t}: ${JSON.stringify(d)}`;
  } catch {
    return raw;
  }
}

type Act = { id: string; message: string; created_at: string; live?: boolean };

export default function AdminDashboardPage() {
  const router = useRouter();
  const t = useTranslations("Admin");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [wsActs, setWsActs] = useState<Act[]>([]);
  const [wsStatus, setWsStatus] = useState<"idle" | "ok" | "err">("idle");
  const idRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!getAdminAccess()) {
      router.replace("/admin/login");
      return;
    }
    void (async () => {
      const res = await apiFetch("/admin/dashboard/", {}, "admin");
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      setData((await res.json()) as Record<string, unknown>);
    })();
  }, [router]);

  useEffect(() => {
    if (!getAdminAccess()) return;
    const url = `${WS_ORIGIN.replace(/\/$/, "")}${ADMIN_WS_PATH}`;
    let retry: ReturnType<typeof setTimeout>;
    let cancelled = false;
    function connect() {
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => setWsStatus("ok");
        ws.onmessage = (ev) => {
          idRef.current += 1;
          const msg = formatWsPayload(String(ev.data));
          setWsActs((prev) =>
            [
              {
                id: `ws-${idRef.current}`,
                message: msg,
                created_at: new Date().toISOString(),
                live: true,
              },
              ...prev.slice(0, 49),
            ]
          );
        };
        ws.onerror = () => setWsStatus("err");
        ws.onclose = () => {
          if (cancelled) return;
          setWsStatus("idle");
          retry = setTimeout(connect, 5000);
        };
      } catch {
        if (!cancelled) {
          setWsStatus("err");
          retry = setTimeout(connect, 5000);
        }
      }
    }
    connect();
    return () => {
      cancelled = true;
      clearTimeout(retry);
      wsRef.current?.close();
    };
  }, [router]);

  const totals = (data?.totals as Record<string, string | number>) || {};
  const apiActs = (data?.activities as { type: string; message: string; created_at: string }[]) || [];
  const mergedActs: Act[] = [
    ...wsActs,
    ...apiActs.map((a, i) => ({
      id: `api-${i}-${a.created_at}`,
      message: a.message,
      created_at: a.created_at,
      live: false,
    })),
  ].slice(0, 40);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white md:text-3xl">{t("dashboard")}</h1>
        <div className="flex gap-2">
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DASH_KEYS.map(({ key, labelKey }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className="border-slate-600/50 bg-[#1e293b] shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-slate-400">
                  {t(labelKey as "dashboard")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums text-white">
                  {totals[key] ?? "—"}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-slate-600/50 bg-[#1e293b] shadow-none">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg text-white">{t("activities")}</CardTitle>
          <span className="text-sm text-slate-400">
            {t("liveFeed")}:{" "}
            <span
              className={
                wsStatus === "ok"
                  ? "font-medium text-emerald-400"
                  : wsStatus === "err"
                    ? "text-amber-400"
                    : "text-slate-500"
              }
            >
              {wsStatus === "ok"
                ? t("wsConnected")
                : wsStatus === "err"
                  ? t("wsError")
                  : t("wsDisconnected")}
            </span>
          </span>
        </CardHeader>
        <CardContent className="space-y-3 text-[15px] leading-snug text-slate-200">
          {mergedActs.length === 0 ? (
            <p className="text-slate-500">—</p>
          ) : (
            mergedActs.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-1 border-b border-slate-600/40 py-2 last:border-0 sm:flex-row sm:justify-between sm:gap-4"
              >
                <span>
                  {a.live && (
                    <span className="me-2 inline-block h-2 w-2 rounded-full bg-emerald-400 align-middle" />
                  )}
                  {a.message}
                </span>
                <span className="shrink-0 text-sm text-slate-500">{a.created_at}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
