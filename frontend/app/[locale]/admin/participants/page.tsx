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

type Comp = { id: number; name: string };
type FlatRow = {
  id: number;
  full_name: string;
  tc_id: string;
  team_name: string;
  competition: string;
  transport_type: string;
  invoice_status: string;
  first_login_at: string | null;
};
type TeamBlock = {
  team_id: number;
  team_name: string;
  participants: {
    id: number;
    full_name: string;
    tc_id: string;
    transport_type: string;
    status: string;
    is_captain: boolean;
  }[];
};

export default function AdminParticipantsPage() {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [comps, setComps] = useState<Comp[]>([]);
  const [compId, setCompId] = useState("");
  const [view, setView] = useState<"flat" | "team">("flat");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [flat, setFlat] = useState<FlatRow[]>([]);
  const [teams, setTeams] = useState<TeamBlock[]>([]);

  useEffect(() => {
    if (!getAdminAccess()) {
      router.replace("/admin/login");
      return;
    }
    void (async () => {
      const res = await apiFetch("/admin/competitions/", {}, "admin");
      if (res.ok) {
        const data = (await res.json()) as Comp[];
        setComps(Array.isArray(data) ? data : []);
      }
    })();
  }, [router]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("view", view);
    if (compId) params.set("competition", compId);
    if (appliedSearch.trim()) params.set("search", appliedSearch.trim());
    const res = await apiFetch(`/admin/participants/?${params}`, {}, "admin");
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    if (view === "team") {
      setTeams(Array.isArray(data) ? (data as TeamBlock[]) : []);
      setFlat([]);
    } else {
      setFlat(Array.isArray(data) ? (data as FlatRow[]) : []);
      setTeams([]);
    }
  }, [appliedSearch, compId, router, view]);

  useEffect(() => {
    void load();
  }, [load]);

  async function resend(pid: number) {
    const res = await apiFetch(
      `/admin/participants/${pid}/resend-link/`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      "admin"
    );
    if (res.ok) void load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("participants")}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("search")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
          <div className="space-y-2">
            <Label>Yarışma</Label>
            <select
              className="flex h-11 min-w-[200px] rounded-lg border border-foreground/15 bg-background px-3 text-sm"
              value={compId}
              onChange={(e) => setCompId(e.target.value)}
            >
              <option value="">—</option>
              {comps.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>{t("search")}</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant={view === "flat" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("flat")}
            >
              {t("viewFlat")}
            </Button>
            <Button
              variant={view === "team" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("team")}
            >
              {t("viewTree")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              {t("refresh")}
            </Button>
            <Button size="sm" onClick={() => setAppliedSearch(search)}>
              {t("applyFilters")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {view === "flat" && (
        <div className="overflow-x-auto rounded-lg border border-foreground/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="p-2">ID</th>
                <th className="p-2">Ad</th>
                <th className="p-2">Takım</th>
                <th className="p-2">Fatura</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {flat.map((r) => (
                <tr key={r.id} className="border-b border-foreground/5">
                  <td className="p-2">{r.id}</td>
                  <td className="p-2">{r.full_name}</td>
                  <td className="p-2">{r.team_name}</td>
                  <td className="p-2">{r.invoice_status}</td>
                  <td className="p-2">
                    <Button size="sm" variant="outline" onClick={() => void resend(r.id)}>
                      {t("resendMagic")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "team" && (
        <div className="space-y-4">
          {teams.map((tb) => (
            <Card key={tb.team_id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{tb.team_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {tb.participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-foreground/10 px-3 py-2"
                  >
                    <div>
                      <span className="font-medium">{p.full_name}</span>
                      {p.is_captain && (
                        <span className="ms-2 text-xs text-primary">captain</span>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {p.transport_type} · {p.status}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => void resend(p.id)}>
                      {t("resendMagic")}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
