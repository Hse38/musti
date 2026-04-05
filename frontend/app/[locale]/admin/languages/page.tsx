"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/http";
import { getAdminAccess } from "@/lib/auth-tokens";

export default function AdminLanguagesPage() {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [list, setList] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!getAdminAccess()) {
      router.replace("/admin/login");
      return;
    }
    void (async () => {
      const res = await apiFetch("/admin/languages/", {}, "admin");
      if (res.ok) setList((await res.json()) as Record<string, unknown>[]);
    })();
  }, [router]);

  async function autoTr(code: string) {
    await apiFetch(`/admin/languages/${code}/auto-translate/`, { method: "POST" }, "admin");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("languages")}</h1>
      <div className="space-y-2">
        {list.map((row) => (
          <Card key={String(row.code)}>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <span>
                {String(row.code)} — {String(row.name)}
              </span>
              <Button size="sm" variant="outline" onClick={() => void autoTr(String(row.code))}>
                Auto-translate
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
