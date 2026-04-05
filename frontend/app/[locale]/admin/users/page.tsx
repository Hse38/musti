"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/http";
import { getAdminAccess } from "@/lib/auth-tokens";

export default function AdminUsersPage() {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!getAdminAccess()) {
      router.replace("/admin/login");
      return;
    }
    void (async () => {
      const res = await apiFetch("/admin/users/", {}, "admin");
      if (res.ok) setUsers((await res.json()) as Record<string, unknown>[]);
    })();
  }, [router]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("users")}</h1>
      <div className="space-y-2">
        {users.map((u) => (
          <Card key={String(u.id)}>
            <CardContent className="p-4 text-sm">
              <span className="font-medium">{String(u.username)}</span>
              <span className="ms-2 text-muted-foreground">{String(u.role)}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
