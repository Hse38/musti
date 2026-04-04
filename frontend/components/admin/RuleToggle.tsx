"use client";

import { useState } from "react";
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

export function RuleToggle({ rule, onUpdated }: { rule: Rule; onUpdated: () => void }) {
  const [active, setActive] = useState(rule.is_active);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const toggle = async () => {
    const prev = active;
    setActive(!prev);
    setPending(true);
    const res = await apiFetch(
      `/admin/rules/${rule.id}/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !prev }),
      },
      true
    );
    setPending(false);
    if (!res.ok) {
      setActive(prev);
      setToast("Güncellenemedi");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    onUpdated();
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        role="switch"
        aria-checked={active}
        onClick={toggle}
        className={`relative w-14 h-8 rounded-full transition ${
          active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition ${
            active ? "translate-x-6" : ""
          }`}
        />
      </button>
      {toast && (
        <span className="text-sm text-red-600 fixed bottom-6 left-1/2 -translate-x-1/2 bg-white shadow px-4 py-2 rounded-lg z-50">
          {toast}
        </span>
      )}
    </div>
  );
}
