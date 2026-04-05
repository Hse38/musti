"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/http";
import { getAdminAccess } from "@/lib/auth-tokens";

type Esc = { id: number; participant: string; question: string; created_at: string };

export default function AdminFaqPage() {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [items, setItems] = useState<Esc[]>([]);
  const [reply, setReply] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!getAdminAccess()) {
      router.replace("/admin/login");
      return;
    }
    void load();
  }, [router]);

  async function load() {
    const res = await apiFetch("/admin/faq/escalations/", {}, "admin");
    if (res.ok) setItems((await res.json()) as Esc[]);
  }

  async function respond(id: number) {
    const text = reply[id]?.trim();
    if (!text) return;
    await apiFetch(
      `/admin/faq/escalations/${id}/respond/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: text }),
      },
      "admin"
    );
    setReply((r) => ({ ...r, [id]: "" }));
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("faq")}</h1>
      {items.length === 0 && (
        <p className="text-muted-foreground">{t("noEscalations")}</p>
      )}
      <div className="space-y-3">
        {items.map((e) => (
          <Card key={e.id}>
            <CardHeader>
              <CardTitle className="text-sm">{e.participant}</CardTitle>
              <p className="text-xs text-muted-foreground">{e.created_at}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{e.question}</p>
              <Input
                placeholder={t("respond")}
                value={reply[e.id] || ""}
                onChange={(ev) =>
                  setReply((r) => ({ ...r, [e.id]: ev.target.value }))
                }
              />
              <Button size="sm" onClick={() => void respond(e.id)}>
                {t("respond")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
