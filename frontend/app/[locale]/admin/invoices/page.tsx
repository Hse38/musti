"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/http";
import { getAdminAccess } from "@/lib/auth-tokens";

type InvRow = {
  id: number;
  status: string;
  confidence: number | null;
  amount: string;
  participant_name: string;
  team_name: string;
  file_url: string;
  created_at: string;
};

export default function AdminInvoicesPage() {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [allRows, setAllRows] = useState<InvRow[]>([]);
  const [filter, setFilter] = useState<"all" | "pending">("pending");
  const [reasons, setReasons] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    const res = await apiFetch("/admin/invoices/", {}, "admin");
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    if (!res.ok) return;
    const data = (await res.json()) as InvRow[];
    setAllRows(Array.isArray(data) ? data : []);
  }, [router]);

  useEffect(() => {
    if (!getAdminAccess()) {
      router.replace("/admin/login");
      return;
    }
    void load();
  }, [load, router]);

  const rows =
    filter === "pending"
      ? allRows.filter((r) => r.status === "pending" || r.status === "manual_review")
      : allRows;

  async function approve(id: number) {
    const res = await apiFetch(
      `/admin/invoices/${id}/approve/`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" },
      "admin"
    );
    if (res.ok) void load();
  }

  async function reject(id: number) {
    const reason = (reasons[id] || "").trim();
    const res = await apiFetch(
      `/admin/invoices/${id}/reject/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      },
      "admin"
    );
    if (res.ok) void load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("invoices")}</h1>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("pending")}
        >
          pending / manual_review
        </Button>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          all
        </Button>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          {t("refresh")}
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noInvoices")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((inv) => (
            <Card key={inv.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  #{inv.id} · {inv.participant_name}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{inv.team_name}</p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2 py-0.5">{inv.status}</span>
                  <span>Σ {inv.amount} TL</span>
                  {inv.confidence != null && (
                    <span className="text-muted-foreground">
                      AI {Math.round(inv.confidence * 100)}%
                    </span>
                  )}
                </div>
                {inv.file_url && (
                  <a
                    href={inv.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    PDF
                  </a>
                )}
                <div className="space-y-2">
                  <Label className="text-xs">{t("rejectReason")}</Label>
                  <Input
                    value={reasons[inv.id] ?? ""}
                    onChange={(e) =>
                      setReasons((r) => ({ ...r, [inv.id]: e.target.value }))
                    }
                    placeholder="…"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void approve(inv.id)}>
                    {t("invoiceApprove")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => void reject(inv.id)}
                  >
                    {t("invoiceReject")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
