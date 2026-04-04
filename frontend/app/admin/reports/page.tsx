"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Tpl = {
  id: number;
  name: string;
  report_type: string;
  is_default: boolean;
};

export default function AdminReportsPage() {
  const [list, setList] = useState<Tpl[]>([]);

  const load = useCallback(() => {
    apiFetch("/admin/report-templates/", {}, true).then((r) => r.json().then(setList));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setDefault = async (id: number) => {
    await apiFetch(`/admin/report-templates/${id}/set-default/`, { method: "PATCH" }, true);
    load();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Rapor şablonları</h1>
      <ul className="space-y-3">
        {list.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <div>
              <p className="font-semibold text-lg">{t.name}</p>
              <p className="text-sm text-slate-500">{t.report_type}</p>
              {t.is_default && (
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  Varsayılan
                </span>
              )}
            </div>
            {!t.is_default && (
              <button
                type="button"
                onClick={() => setDefault(t.id)}
                className="min-h-[48px] px-4 rounded-xl bg-sky-600 text-white"
              >
                Varsayılan yap
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
