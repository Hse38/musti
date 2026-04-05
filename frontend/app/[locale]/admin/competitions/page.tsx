"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/http";
import { getAdminAccess } from "@/lib/auth-tokens";

export default function AdminCompetitionsPage() {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [list, setList] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!getAdminAccess()) {
      router.replace("/admin/login");
      return;
    }
    void (async () => {
      const res = await apiFetch("/admin/competitions/", {}, "admin");
      if (!res.ok) return;
      setList((await res.json()) as Record<string, unknown>[]);
    })();
  }, [router]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("competitions")}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((c) => (
          <Link key={String(c.id)} href={`/admin/competitions/${c.id}`}>
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="p-4">
                <p className="font-medium">{String(c.name)}</p>
                <p className="text-xs text-muted-foreground">{String(c.slug)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
