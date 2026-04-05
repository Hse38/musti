"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE } from "@/lib/constants";
import { apiFetch } from "@/lib/http";
import { getAdminAccess } from "@/lib/auth-tokens";

type LaunchResult = {
  competition_id: number;
  competition_name: string;
  teams_added: number;
  participants_added: number;
  emails_sent: number;
};

export default function AdminCompetitionsPage() {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [list, setList] = useState<Record<string, unknown>[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<LaunchResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [maxSup, setMaxSup] = useState("4");
  const [ae, setAe] = useState("");
  const [al, setAl] = useState("");
  const [de, setDe] = useState("");
  const [dl, setDl] = useState("");

  async function reloadList() {
    const res = await apiFetch("/admin/competitions/", {}, "admin");
    if (res.ok) setList((await res.json()) as Record<string, unknown>[]);
  }

  useEffect(() => {
    if (!getAdminAccess()) {
      router.replace("/admin/login");
      return;
    }
    void reloadList();
  }, [router]);

  async function onLaunch(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setDone(null);
    const f = fileRef.current?.files?.[0];
    if (!f) {
      setErr("XLSX seçin.");
      return;
    }
    const fd = new FormData();
    fd.append("file", f);
    fd.append("max_supported_members", maxSup);
    fd.append("arrival_earliest", ae);
    fd.append("arrival_latest", al);
    fd.append("departure_earliest", de);
    fd.append("departure_latest", dl);

    setLoading(true);
    try {
      const tok = getAdminAccess();
      const res = await fetch(`${API_BASE}/admin/competitions/launch/`, {
        method: "POST",
        headers: tok ? { Authorization: `Bearer ${tok}` } : {},
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr((data as { detail?: string }).detail || "Hata");
        return;
      }
      setDone(data as LaunchResult);
      if (fileRef.current) fileRef.current.value = "";
      void reloadList();
    } catch {
      setErr("İstek başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white md:text-3xl">{t("competitions")}</h1>
        <Button
          type="button"
          className="bg-sky-600 text-white hover:bg-sky-500"
          onClick={() => {
            setShowWizard((v) => !v);
            setErr(null);
            setDone(null);
          }}
        >
          {t("newCompetitionFlow")}
        </Button>
      </div>

      {showWizard && (
        <Card className="border-slate-600/50 bg-[#1e293b] shadow-none">
          <CardHeader>
            <CardTitle className="text-lg text-white">{t("newCompetitionFlow")}</CardTitle>
            <p className="text-[15px] text-slate-400">{t("wizardHint")}</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(e) => void onLaunch(e)}>
              <div className="space-y-2">
                <Label className="text-slate-200">{t("wizardXlsx")}</Label>
                <Input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="cursor-pointer border-slate-600 bg-[#0f172a] text-slate-200 file:me-3 file:rounded file:border-0 file:bg-sky-700 file:px-3 file:py-1.5 file:text-sm file:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">{t("wizardMaxSupported")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={maxSup}
                  onChange={(e) => setMaxSup(e.target.value)}
                  className="border-slate-600 bg-[#0f172a] text-slate-100"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-slate-200">{t("wizardArrivalEarliest")}</Label>
                  <Input
                    type="date"
                    required
                    value={ae}
                    onChange={(e) => setAe(e.target.value)}
                    className="border-slate-600 bg-[#0f172a] text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200">{t("wizardArrivalLatest")}</Label>
                  <Input
                    type="date"
                    required
                    value={al}
                    onChange={(e) => setAl(e.target.value)}
                    className="border-slate-600 bg-[#0f172a] text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200">{t("wizardDepartureEarliest")}</Label>
                  <Input
                    type="date"
                    required
                    value={de}
                    onChange={(e) => setDe(e.target.value)}
                    className="border-slate-600 bg-[#0f172a] text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200">{t("wizardDepartureLatest")}</Label>
                  <Input
                    type="date"
                    required
                    value={dl}
                    onChange={(e) => setDl(e.target.value)}
                    className="border-slate-600 bg-[#0f172a] text-slate-100"
                  />
                </div>
              </div>
              {err && (
                <p className="rounded-lg bg-red-500/15 px-3 py-2 text-[15px] text-red-300">{err}</p>
              )}
              {done && (
                <div className="rounded-lg bg-emerald-500/15 px-4 py-3 text-[15px] text-emerald-100">
                  <p className="font-medium">{done.competition_name}</p>
                  <p className="mt-1 text-emerald-200/90">
                    {t("wizardSummary", {
                      teams: done.teams_added,
                      participants: done.participants_added,
                    })}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 border-slate-500 text-slate-200 hover:bg-slate-700"
                    onClick={() => setDone(null)}
                  >
                    {t("wizardClose")}
                  </Button>
                </div>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="bg-sky-600 text-white hover:bg-sky-500"
              >
                {loading ? "…" : t("wizardStart")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <Link key={String(c.id)} href={`/admin/competitions/${c.id}`}>
            <Card className="h-full border-slate-600/50 bg-[#1e293b] shadow-none transition-colors hover:border-sky-500/40">
              <CardContent className="p-5">
                <p className="text-lg font-medium text-white">{String(c.name)}</p>
                <p className="mt-1 text-sm text-slate-400">{String(c.slug)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
