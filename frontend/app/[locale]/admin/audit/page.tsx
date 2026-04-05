"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/http";
import { getAdminAccess } from "@/lib/auth-tokens";

export default function AdminAuditPage() {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!getAdminAccess()) {
      router.replace("/admin/login");
      return;
    }
    void (async () => {
      const res = await apiFetch("/admin/audit-logs/", {}, "admin");
      if (res.ok) setLogs((await res.json()) as Record<string, unknown>[]);
    })();
  }, [router]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("audit")}</h1>
      <Card>
        <CardContent className="max-h-[70dvh] overflow-auto p-4 font-mono text-xs">
          <pre>{JSON.stringify(logs, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
