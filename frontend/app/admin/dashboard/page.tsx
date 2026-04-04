"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function AdminDashboardPage() {
  const [data, setData] = useState<{
    totals: Record<string, number>;
    recent_sessions: { id: string; status: string; summary: unknown }[];
    health: { database: boolean; modules: unknown[] };
  } | null>(null);

  useEffect(() => {
    apiFetch("/admin/dashboard/", {}, true).then((r) => r.json().then(setData));
  }, []);

  if (!data) {
    return <div className="animate-pulse text-slate-500">Özet yükleniyor…</div>;
  }

  const t = data.totals || {};
  return (
    <div className="space-y-8 max-w-4xl">
      <h1 className="text-2xl font-bold">Özet</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Oturum", t.sessions],
          ["Onaylı kayıt", t.approved_submissions],
          ["Red kayıt", t.rejected_submissions],
          ["Aktif modül", t.active_modules],
        ].map(([k, v]) => (
          <div
            key={String(k)}
            className="rounded-xl border bg-white dark:bg-slate-900 p-4 border-slate-200 dark:border-slate-800"
          >
            <p className="text-sm text-slate-500">{k}</p>
            <p className="text-2xl font-bold">{v ?? 0}</p>
          </div>
        ))}
      </div>
      <section>
        <h2 className="text-lg font-semibold mb-2">Son oturumlar</h2>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-base min-w-[480px]">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="text-left p-3">ID</th>
                <th className="text-left p-3">Durum</th>
                <th className="text-left p-3">Özet</th>
              </tr>
            </thead>
            <tbody>
              {(data.recent_sessions || []).map((s) => (
                <tr key={s.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="p-3 font-mono text-sm">{s.id.slice(0, 8)}…</td>
                  <td className="p-3">{s.status}</td>
                  <td className="p-3 text-sm">{JSON.stringify(s.summary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-2">Sağlık</h2>
        <p className="text-base">
          Veritabanı: {data.health?.database ? "✅" : "❌"}
        </p>
        <ul className="mt-2 space-y-1 text-base">
          {(
            (data.health?.modules || []) as { name: string; active: boolean }[]
          ).map((m) => (
            <li key={m.name}>
              {m.name}: {m.active ? "açık" : "kapalı"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
