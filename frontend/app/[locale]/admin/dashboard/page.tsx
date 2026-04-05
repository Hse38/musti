"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/http";
import { getAdminAccess } from "@/lib/auth-tokens";

const TOTAL_KEYS: { key: string; labelKey: string }[] = [
  { key: "participants_total", labelKey: "participantsTotal" },
  { key: "participants_logged_in", labelKey: "participantsLoggedIn" },
  { key: "participants_not_logged_in", labelKey: "participantsNotLoggedIn" },
  { key: "transport_plane", labelKey: "transportPlane" },
  { key: "transport_bus_train", labelKey: "transportBusTrain" },
  { key: "invoices_pending", labelKey: "invoicesPending" },
  { key: "invoices_approved", labelKey: "invoicesApprovedCount" },
  { key: "invoices_rejected", labelKey: "invoicesRejectedCount" },
  { key: "approved_amount_tl", labelKey: "approvedAmountTl" },
  { key: "sessions", labelKey: "sessions" },
  { key: "approved_submissions", labelKey: "approved_submissions" },
  { key: "rejected_submissions", labelKey: "rejected_submissions" },
  { key: "active_modules", labelKey: "active_modules" },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const t = useTranslations("Admin");
  const [data, setData] = useState<Record<string, unknown> | null>(null);

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

  const totals = (data?.totals as Record<string, string | number>) || {};
  const activities = (data?.activities as { type: string; message: string; created_at: string }[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
        <div className="flex gap-2">
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TOTAL_KEYS.map(({ key, labelKey }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t(labelKey as "dashboard")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{totals[key] ?? "—"}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("activities")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {activities.length === 0 ? (
            <p className="text-muted-foreground">—</p>
          ) : (
            activities.map((a) => (
              <div
                key={`${a.type}-${a.created_at}`}
                className="flex justify-between gap-2 border-b border-foreground/5 py-1 last:border-0"
              >
                <span>{a.message}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{a.created_at}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent sessions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <pre className="max-h-64 overflow-auto rounded-lg bg-muted/50 p-3 text-xs">
            {JSON.stringify(data?.recent_sessions ?? [], null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
