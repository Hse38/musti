"use client";

import { useCallback, useEffect, useState } from "react";
import { RuleToggle } from "@/components/admin/RuleToggle";
import { apiFetch } from "@/lib/api";

type Rule = {
  id: number;
  name: string;
  display_name: string;
  description: string;
  category: string;
  is_active: boolean;
  priority: number;
  is_blocking: boolean;
};

export default function AdminRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [cat, setCat] = useState("");
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);

  const load = useCallback(() => {
    const q = cat ? `?category=${encodeURIComponent(cat)}` : "";
    apiFetch(`/admin/rules/${q}`, {}, true).then((r) => r.json().then(setRules));
  }, [cat]);

  useEffect(() => {
    apiFetch("/admin/rules/categories/", {}, true).then((r) =>
      r.json().then(setCategories)
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updatePriority = async (id: number, priority: number) => {
    await apiFetch(
      `/admin/rules/${id}/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      },
      true
    );
    load();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Kural yönetimi</h1>
      <select
        className="min-h-[48px] text-base border rounded-xl px-3 dark:bg-slate-900"
        value={cat}
        onChange={(e) => setCat(e.target.value)}
      >
        <option value="">Tüm kategoriler</option>
        {categories.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <ul className="space-y-4">
        {rules.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-lg">{r.display_name}</p>
                <p className="text-sm text-slate-500">{r.name}</p>
                <p className="text-base mt-2 text-slate-600 dark:text-slate-300">
                  {r.description}
                </p>
              </div>
              <RuleToggle rule={r} onUpdated={load} />
            </div>
            <div className="flex items-center gap-4 mt-4">
              <label className="text-base flex items-center gap-2">
                Öncelik
                <input
                  type="number"
                  className="w-24 min-h-[44px] border rounded-lg px-2 dark:bg-slate-950"
                  defaultValue={r.priority}
                  onBlur={(e) =>
                    updatePriority(r.id, parseInt(e.target.value, 10) || r.priority)
                  }
                />
              </label>
              <span className="text-sm text-slate-500">
                {r.is_blocking ? "Bloklayıcı" : "Biriktiren"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
