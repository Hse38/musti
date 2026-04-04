"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE, apiFetch, getAccessToken } from "@/lib/api";

type Mod = {
  name: string;
  display_name: string;
  description: string;
  is_active: boolean;
  config: Record<string, unknown>;
  version: string;
  config_schema: Record<string, { type: string; label: string; default?: unknown }>;
};

export default function AdminModulesPage() {
  const [mods, setMods] = useState<Mod[]>([]);

  const load = useCallback(() => {
    apiFetch("/admin/modules/", {}, true).then((r) => r.json().then(setMods));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (name: string, body: object) => {
    await apiFetch(`/admin/modules/${name}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, true);
    load();
  };

  const syncKys = async () => {
    const res = await fetch(`${API_BASE}/modules/kys/sync/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAccessToken()}`,
      },
    });
    alert(res.ok ? "Senkron isteği gönderildi (stub)." : "Hata veya modül kapalı.");
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Modüller</h1>
      <div className="space-y-6">
        {mods.map((m) => (
          <div
            key={m.name}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{m.display_name}</h2>
                <p className="text-sm text-slate-500">{m.name} · v{m.version}</p>
                <p className="text-base mt-2">{m.description}</p>
              </div>
              <button
                type="button"
                onClick={() => patch(m.name, { is_active: !m.is_active })}
                className={`min-h-[48px] px-4 rounded-xl text-white font-medium ${
                  m.is_active ? "bg-rose-600" : "bg-emerald-600"
                }`}
              >
                {m.is_active ? "Kapat" : "Aç"}
              </button>
            </div>
            {m.name === "kys" && m.is_active && (
              <button
                type="button"
                onClick={syncKys}
                className="mt-4 min-h-[48px] px-4 rounded-xl bg-sky-600 text-white"
              >
                Şimdi Senkronize Et
              </button>
            )}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Object.entries(m.config_schema || {}).map(([key, schema]) => (
                <label key={key} className="block text-base">
                  {schema.label}
                  <input
                    className="mt-1 w-full min-h-[44px] border rounded-lg px-2 dark:bg-slate-950"
                    type={schema.type === "number" ? "number" : "text"}
                    defaultValue={String(m.config[key] ?? schema.default ?? "")}
                    onBlur={(e) => {
                      const val =
                        schema.type === "number"
                          ? Number(e.target.value)
                          : e.target.value;
                      patch(m.name, {
                        config: { ...m.config, [key]: val },
                      });
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
