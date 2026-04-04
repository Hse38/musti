"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

type Session = {
  id: string;
  status: string;
  summary: Record<string, unknown>;
  error_message?: string;
};

type Submission = {
  id: number;
  participant_name: string;
  status: string;
  rejection_reasons: string[];
  invoice_amount: string | null;
  transport_type_on_invoice?: string;
};

export default function ResultsPage() {
  const params = useParams();
  const id = params.id as string;
  const [session, setSession] = useState<Session | null>(null);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<"all" | "approved" | "rejected">("all");
  const [open, setOpen] = useState<number | null>(null);
  const [dlLoading, setDlLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [sr, subr] = await Promise.all([
      fetch(`${API_BASE}/sessions/${id}/`),
      fetch(`${API_BASE}/sessions/${id}/submissions/`),
    ]);
    if (sr.ok) setSession(await sr.json());
    if (subr.ok) setSubs(await subr.json());
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (session?.status === "processing" || session?.status === "pending") {
      const t = setInterval(load, 3000);
      return () => clearInterval(t);
    }
  }, [session?.status, load]);

  const filtered =
    filter === "all"
      ? subs
      : subs.filter((s) => s.status === filter);

  const summary = session?.summary || {};
  const total = Number(summary.total ?? subs.length);
  const approved = Number(summary.approved ?? 0);
  const rejected = Number(summary.rejected ?? 0);
  const amount = String(summary.total_amount ?? "0");

  const download = async (kind: "result" | "payment") => {
    setDlLoading(kind);
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}/report/${kind}/`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = kind === "result" ? "sonuc.xlsx" : "odeme.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDlLoading(null);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 px-4 py-6 max-w-lg mx-auto">
      <header className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="min-h-[48px] min-w-[48px] inline-flex items-center justify-center text-sky-600 text-lg"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sonuçlar</h1>
      </header>

      {session?.status === "failed" && (
        <div className="mb-4 rounded-xl bg-red-50 text-red-800 px-4 py-3 text-base">
          {session.error_message || "İşlem başarısız."}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500">Başvuru</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500">Durum</p>
          <p className="text-base font-semibold capitalize">{session?.status}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-200 dark:border-emerald-900">
          <p className="text-sm text-emerald-800 dark:text-emerald-200">Onaylı</p>
          <p className="text-2xl font-bold text-emerald-700">{approved}</p>
        </div>
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-4 border border-rose-200 dark:border-rose-900">
          <p className="text-sm text-rose-800 dark:text-rose-200">Red</p>
          <p className="text-2xl font-bold text-rose-700">{rejected}</p>
        </div>
      </div>
      <p className="text-base text-slate-600 dark:text-slate-300 mb-4">
        💰 Toplam tutar (onaylı): <strong>{amount} TL</strong>
      </p>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          disabled={!!dlLoading}
          onClick={() => download("result")}
          className="flex-1 min-h-[48px] rounded-xl bg-slate-800 text-white text-base font-medium"
        >
          {dlLoading === "result" ? "…" : "Sonuç ↓"}
        </button>
        <button
          type="button"
          disabled={!!dlLoading}
          onClick={() => download("payment")}
          className="flex-1 min-h-[48px] rounded-xl bg-sky-600 text-white text-base font-medium"
        >
          {dlLoading === "payment" ? "…" : "Ödeme ↓"}
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(["all", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`shrink-0 px-4 min-h-[44px] rounded-full text-base border ${
              filter === f
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
            }`}
          >
            {f === "all" ? "Tümü" : f === "approved" ? "Onaylı" : "Reddedildi"}
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {filtered.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
          >
            <button
              type="button"
              className="w-full text-left px-4 py-3 min-h-[56px] flex items-center justify-between gap-2"
              onClick={() => setOpen(open === s.id ? null : s.id)}
            >
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-white">
                  {s.participant_name}{" "}
                  <span>{s.status === "approved" ? "✅" : "❌"}</span>
                </p>
                <p className="text-sm text-slate-500">
                  {s.invoice_amount != null ? `${s.invoice_amount} TL` : "—"}
                </p>
              </div>
              <span className="text-slate-400">▼</span>
            </button>
            {open === s.id && s.rejection_reasons?.length > 0 && (
              <div className="px-4 pb-3 text-base text-red-700 dark:text-red-300 border-t border-slate-100 dark:border-slate-800 pt-2">
                {s.rejection_reasons.map((r) => (
                  <p key={r}>• {r}</p>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
