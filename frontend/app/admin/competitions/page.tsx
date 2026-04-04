"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Competition = {
  id: number;
  name: string;
  slug: string;
  start_date: string;
  end_date: string;
  max_supported_members: number;
};
type Team = { id: number; name: string; team_code: string };
type Participant = {
  id: number;
  full_name: string;
  tc_id: string;
  transport_type: string;
  is_supported: boolean;
  iban: string;
  bank_name: string;
  account_holder_name: string;
};

export default function AdminCompetitionsPage() {
  const [list, setList] = useState<Competition[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamExp, setTeamExp] = useState<number | null>(null);
  const [parts, setParts] = useState<Participant[]>([]);

  const load = useCallback(() => {
    apiFetch("/admin/competitions/", {}, true).then((r) => r.json().then(setList));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadTeams = async (cid: number) => {
    const r = await apiFetch(`/admin/competitions/${cid}/teams/`, {}, true);
    setTeams(await r.json());
  };

  const loadParts = async (tid: number) => {
    const r = await apiFetch(`/admin/teams/${tid}/participants/`, {}, true);
    setParts(await r.json());
  };

  const createComp = async () => {
    const name = prompt("Yarışma adı?");
    if (!name) return;
    const slug = prompt("Slug (benzersiz)?", name.toLowerCase().replace(/\s+/g, "-"));
    if (!slug) return;
    await apiFetch("/admin/competitions/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        start_date: "2025-01-01",
        end_date: "2025-12-31",
        max_supported_members: 10,
        is_active: true,
      }),
    }, true);
    load();
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Yarışmalar</h1>
        <button
          type="button"
          onClick={createComp}
          className="min-h-[48px] px-4 rounded-xl bg-sky-600 text-white font-medium"
        >
          Yeni yarışma
        </button>
      </div>
      <ul className="space-y-3">
        {list.map((c) => (
          <li
            key={c.id}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <button
              type="button"
              className="text-left w-full min-h-[48px]"
              onClick={() => {
                setExpanded(expanded === c.id ? null : c.id);
                if (expanded !== c.id) loadTeams(c.id);
              }}
            >
              <span className="font-semibold text-lg">{c.name}</span>
              <span className="text-slate-500 text-base ml-2">{c.slug}</span>
            </button>
            {expanded === c.id && (
              <div className="mt-4 pl-2 border-l-2 border-sky-200 space-y-2">
                <p className="font-medium text-base">Takımlar</p>
                {teams.map((t) => (
                  <div key={t.id} className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
                    <button
                      type="button"
                      className="text-base font-medium min-h-[44px]"
                      onClick={() => {
                        setTeamExp(teamExp === t.id ? null : t.id);
                        if (teamExp !== t.id) loadParts(t.id);
                      }}
                    >
                      {t.name} ({t.team_code})
                    </button>
                    {teamExp === t.id && (
                      <ul className="mt-2 space-y-2">
                        {parts.map((p) => (
                          <li key={p.id} className="text-base border-t border-slate-200 pt-2">
                            <strong>{p.full_name}</strong> — {p.tc_id} — {p.transport_type}{" "}
                            {p.is_supported ? "destekli" : "desteksiz"}
                            <div className="text-sm text-slate-500">
                              IBAN: {p.iban || "—"}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
