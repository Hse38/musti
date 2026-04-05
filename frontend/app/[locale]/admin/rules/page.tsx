"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/http";
import { getAdminAccess } from "@/lib/auth-tokens";

type Rule = {
  id: number;
  name: string;
  display_name: string;
  is_active: boolean;
  is_blocking: boolean;
};

export default function AdminRulesPage() {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => {
    if (!getAdminAccess()) {
      router.replace("/admin/login");
      return;
    }
    void (async () => {
      const res = await apiFetch("/admin/rules/", {}, "admin");
      if (res.ok) setRules((await res.json()) as Rule[]);
    })();
  }, [router]);

  async function toggle(r: Rule, active: boolean) {
    await apiFetch(
      `/admin/rules/${r.id}/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: active }),
      },
      "admin"
    );
    setRules((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, is_active: active } : x))
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("rules")}</h1>
      {rules.length === 0 && <p className="text-muted-foreground">{t("noRules")}</p>}
      <div className="space-y-2">
        {rules.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">{r.display_name}</p>
                <p className="text-xs text-muted-foreground">{r.name}</p>
              </div>
              <Switch
                checked={r.is_active}
                onCheckedChange={(v) => void toggle(r, v)}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
