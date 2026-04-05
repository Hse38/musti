"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/http";
import { getAdminAccess } from "@/lib/auth-tokens";

type Mod = { name: string; is_active: boolean; display_name: string };

export default function AdminModulesPage() {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [mods, setMods] = useState<Mod[]>([]);

  useEffect(() => {
    if (!getAdminAccess()) {
      router.replace("/admin/login");
      return;
    }
    void (async () => {
      const res = await apiFetch("/admin/modules/", {}, "admin");
      if (res.ok) setMods((await res.json()) as Mod[]);
    })();
  }, [router]);

  async function toggle(m: Mod, v: boolean) {
    await apiFetch(
      `/admin/modules/${m.name}/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: v }),
      },
      "admin"
    );
    setMods((prev) =>
      prev.map((x) => (x.name === m.name ? { ...x, is_active: v } : x))
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("modules")}</h1>
      <div className="space-y-2">
        {mods.map((m) => (
          <Card key={m.name}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{m.display_name}</p>
                <p className="text-xs text-muted-foreground">{m.name}</p>
              </div>
              <Switch
                checked={m.is_active}
                onCheckedChange={(v) => void toggle(m, v)}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
