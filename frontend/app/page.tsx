"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FileDropzone } from "@/components/user/FileDropzone";
import { API_BASE } from "@/lib/api";

type Comp = { id: number; name: string; slug: string };

export default function UploadPage() {
  const [competitions, setCompetitions] = useState<Comp[]>([]);
  const [competitionId, setCompetitionId] = useState("");
  const [teamCode, setTeamCode] = useState("DEMO-001");
  const [personCount, setPersonCount] = useState("");
  const [transportFile, setTransportFile] = useState<File | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [invoices, setInvoices] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/competitions/`)
      .then((r) => r.json())
      .then((data) => {
        setCompetitions(data);
        if (data[0]) setCompetitionId(String(data[0].id));
      })
      .catch(() => setError("Yarışma listesi yüklenemedi. API adresini kontrol edin."));
  }, []);

  const addInvoices = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    setInvoices((prev) => [...prev, ...arr]);
  }, []);

  const removeInvoice = (idx: number) => {
    setInvoices((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    setError(null);
    if (!competitionId || !teamCode.trim()) {
      setError("Yarışma ve takım kodu zorunludur.");
      return;
    }
    if (!transportFile || !paymentFile) {
      setError("Talep ve ödeme dosyalarını yükleyin.");
      return;
    }
    setLoading(true);
    setProgress("Oturum oluşturuluyor...");
    const fd = new FormData();
    fd.append("competition_id", competitionId);
    fd.append("team_code", teamCode.trim());
    fd.append("transport_request_file", transportFile);
    fd.append("ticket_payment_file", paymentFile);
    invoices.forEach((f) => fd.append("invoices", f));
    try {
      const res = await fetch(`${API_BASE}/sessions/`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { detail?: string }).detail || "Analiz başlatılamadı.");
        setLoading(false);
        setProgress("");
        return;
      }
      setProgress("Yönlendiriliyor...");
      window.location.href = `/results/${(data as { id: string }).id}`;
    } catch {
      setError("Ağ hatası. Bağlantınızı kontrol edin.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-4 py-6 md:py-10 max-w-lg mx-auto w-full">
      <header className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-sky-600 font-semibold">
            TEKNOFEST
          </p>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
            Bilet Kontrol
          </h1>
        </div>
        <Link
          href="/admin/login"
          className="text-base text-sky-600 min-h-[48px] inline-flex items-center px-2"
        >
          Admin
        </Link>
      </header>

      {error && (
        <div
          className="mb-4 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200 px-4 py-3 text-base border border-red-200 dark:border-red-900"
          role="alert"
        >
          {error}
        </div>
      )}

      <section className="space-y-5">
        <div>
          <label className="block text-base font-medium mb-2 text-slate-800 dark:text-slate-100">
            Yarışma
          </label>
          <select
            className="w-full min-h-[48px] text-base rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3"
            value={competitionId}
            onChange={(e) => setCompetitionId(e.target.value)}
          >
            <option value="">Seçin</option>
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-base font-medium mb-2 text-slate-800 dark:text-slate-100">
            Takım kodu
          </label>
          <input
            className="w-full min-h-[48px] text-base rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3"
            value={teamCode}
            onChange={(e) => setTeamCode(e.target.value)}
            placeholder="Örn. DEMO-001"
          />
        </div>
        <div>
          <label className="block text-base font-medium mb-2 text-slate-800 dark:text-slate-100">
            Kişi sayısı (bilgi)
          </label>
          <input
            type="number"
            min={0}
            className="w-full min-h-[48px] text-base rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3"
            value={personCount}
            onChange={(e) => setPersonCount(e.target.value)}
            placeholder="Opsiyonel"
          />
        </div>

        <FileDropzone
          label="Talep dosyası"
          hint="xlsx / csv — sürükleyin veya dokunun"
          accept=".xlsx,.xls,.csv"
          icon="📄"
          onFiles={(fs) => setTransportFile(Array.from(fs)[0] || null)}
        />
        {transportFile && (
          <p className="text-sm text-slate-600 -mt-2">{transportFile.name}</p>
        )}

        <FileDropzone
          label="Ödeme talep dosyası"
          hint="xlsx / csv"
          accept=".xlsx,.xls,.csv"
          icon="💳"
          onFiles={(fs) => setPaymentFile(Array.from(fs)[0] || null)}
        />
        {paymentFile && (
          <p className="text-sm text-slate-600 -mt-2">{paymentFile.name}</p>
        )}

        <FileDropzone
          label="Faturalar"
          hint="Çoklu PDF seçin"
          accept=".pdf"
          multiple
          icon="🧾"
          onFiles={addInvoices}
        />
        {invoices.length > 0 && (
          <ul className="space-y-2">
            {invoices.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center justify-between gap-2 text-base bg-white dark:bg-slate-900 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700"
              >
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  className="shrink-0 text-red-600 min-h-[44px] px-2"
                  onClick={() => removeInvoice(i)}
                >
                  Kaldır
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={submit}
          className="w-full min-h-[52px] rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-base font-semibold shadow-lg shadow-sky-600/20"
        >
          {loading ? progress || "İşleniyor..." : "Analiz Başlat"}
        </button>
      </section>
    </div>
  );
}
