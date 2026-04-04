"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Log = {
  id: number;
  user: string | null;
  action: string;
  target_type: string;
  target_id: string;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);

  const load = useCallback(() => {
    apiFetch("/admin/audit-logs/", {}, true).then((r) => r.json().then(setLogs));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">Audit log</h1>
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="text-left p-2">Kullanıcı</th>
              <th className="text-left p-2">İşlem</th>
              <th className="text-left p-2">Hedef</th>
              <th className="text-left p-2">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="p-2">{l.user || "—"}</td>
                <td className="p-2">{l.action}</td>
                <td className="p-2">
                  {l.target_type} #{l.target_id}
                </td>
                <td className="p-2 whitespace-nowrap">{l.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
