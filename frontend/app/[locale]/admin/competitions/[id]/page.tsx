"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/http";
import { getAdminAccess } from "@/lib/auth-tokens";

export default function CompetitionDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const t = useTranslations("Admin");
  const [teams, setTeams] = useState<Record<string, unknown>[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!getAdminAccess()) {
      router.replace("/admin/login");
      return;
    }
    if (!id) return;
    void (async () => {
      const res = await apiFetch(`/admin/competitions/${id}/teams/`, {}, "admin");
      if (res.ok) setTeams((await res.json()) as Record<string, unknown>[]);
    })();
  }, [id, router]);

  async function uploadXlsx() {
    const f = fileRef.current?.files?.[0];
    if (!f || !id) return;
    setMsg(null);
    const fd = new FormData();
    fd.append("file", f);
    const res = await apiFetch(`/admin/competitions/${id}/upload-participants/`, {
      method: "POST",
      body: fd,
    }, "admin");
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "upload_ok" : ((d as { detail?: string }).detail || "err"));
  }

  async function postAction(path: string) {
    if (!id) return;
    setMsg(null);
    const res = await apiFetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }, "admin");
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? JSON.stringify(d) : ((d as { detail?: string }).detail || "err"));
  }

  return (
    <div className="space-y-4">
      <Link href="/admin/competitions" className="text-sm text-primary">
        ←
      </Link>
      <h1 className="text-2xl font-bold">Competition #{id}</h1>
      {msg && (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          {msg}
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("uploadSpreadsheet")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
          <Button size="sm" onClick={() => void uploadXlsx()}>
            {t("uploadSpreadsheet")}
          </Button>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => void postAction(`/admin/competitions/${id}/send-magic-links/`)}>
          {t("sendMagicLinks")}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => void postAction(`/admin/competitions/${id}/send-reminder/`)}>
          {t("sendReminders")}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {teams.map((team) => (
            <Link
              key={String(team.id)}
              href={`/admin/teams/${team.id}`}
              className="block rounded-lg border border-foreground/10 p-3 hover:border-primary/30"
            >
              <span className="font-medium">{String(team.name)}</span>
              <span className="ms-2 text-xs text-muted-foreground">
                {String(team.team_code)}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
