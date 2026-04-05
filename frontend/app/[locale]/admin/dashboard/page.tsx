"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/http";
import { getAdminAccess } from "@/lib/auth-tokens";

export default function AdminDashboardPage() {
  const router = useRouter();
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

  const totals = (data?.totals as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["sessions", totals.sessions],
          ["approved", totals.approved_submissions],
          ["rejected", totals.rejected_submissions],
          ["modules", totals.active_modules],
        ].map(([k, v], i) => (
          <motion.div
            key={k as string}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium capitalize text-muted-foreground">
                  {k as string}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{v ?? "—"}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
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
