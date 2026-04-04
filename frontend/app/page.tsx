"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FileDropzone } from "@/components/user/FileDropzone";
import { API_BASE } from "@/lib/api";

type Comp = { id: number; name: string; slug: string };

export default function UploadPage() {
  const [competitions, setCompetitions] = useState<Comp[]>([]);
  const [competitionMode, setCompetitionMode] = useState<"list" | "manual">(
    "list"
  );
  const [competitionId, setCompetitionId] = useState("");
  const [manualCompetitionName, setManualCompetitionName] = useState("");
  const [supportedCount, setSupportedCount] = useState("");
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
        if (Array.isArray(data)) {
          setCompetitions(data);
          if (data[0]) setCompetitionId(String(data[0].id));
        }
      })
      .catch(() =>
        setError("Yarışma listesi yüklenemedi. API adresini kontrol edin.")
      );
  }, []);

  const addInvoices = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) =>
      f.name.toLowerCase().endsWith(".pdf")
    );
    setInvoices((prev) => [...prev, ...arr]);
  }, []);

  const removeInvoice = (idx: number) => {
    setInvoices((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    setError(null);
    if (competitionMode === "list" && !competitionId) {
      setError("Yarışma seçin veya manuel giriş yapın.");
      return;
    }
    if (competitionMode === "manual" && !manualCompetitionName.trim()) {
      setError("Manuel yarışma adı girin.");
      return;
    }
    if (!transportFile || !paymentFile) {
      setError("Destek talep raporu ve bilet ödeme talep dosyasını yükleyin.");
      return;
    }
    setLoading(true);
    setProgress("Oturum oluşturuluyor...");
    const fd = new FormData();
    if (competitionMode === "list") {
      fd.append("competition_id", competitionId);
    } else {
      fd.append("manual_competition_name", manualCompetitionName.trim());
    }
    if (supportedCount.trim()) {
      fd.append("supported_count", supportedCount.trim());
    }
    fd.append("transport_request_file", transportFile);
    fd.append("ticket_payment_file", paymentFile);
    invoices.forEach((f) => fd.append("invoices", f));
    try {
      const res = await fetch(`${API_BASE}/sessions/`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof (data as { detail?: unknown }).detail === "string"
            ? (data as { detail: string }).detail
            : JSON.stringify((data as { detail?: unknown }).detail) ||
              "Analiz başlatılamadı.";
        setError(msg);
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
            className="w-full min-h-[48px] text-base rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 mb-2"
            value={competitionMode}
            onChange={(e) =>
              setCompetitionMode(e.target.value as "list" | "manual")
            }
          >
            <option value="list">Listeden seç</option>
            <option value="manual">Manuel gir</option>
          </select>
          {competitionMode === "list" && (
            <>
              {competitions.length === 0 ? (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Yarışma bulunamadı; admin panelinden ekleyin veya manuel girin.
                </p>
              ) : (
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
              )}
            </>
          )}
          {competitionMode === "manual" && (
            <input
              className="w-full min-h-[48px] text-base rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 mt-1"
              value={manualCompetitionName}
              onChange={(e) => setManualCompetitionName(e.target.value)}
              placeholder="Yarışma adı"
            />
          )}
        </div>

        <div>
          <label className="block text-base font-medium mb-2 text-slate-800 dark:text-slate-100">
            Desteklenecek kişi sayısı
          </label>
          <input
            type="number"
            min={1}
            className="w-full min-h-[48px] text-base rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3"
            value={supportedCount}
            onChange={(e) => setSupportedCount(e.target.value)}
            placeholder="Üst sınır (boş bırakılırsa yarışma ayarı)"
          />
        </div>

        <div>
          <p className="font-medium text-base text-slate-800 dark:text-slate-100">
            Destek Talep Raporu
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            KYS&apos;den indirilen Excel/CSV dosyası
          </p>
          <FileDropzone
            label=""
            hint="xlsx / csv — sürükleyin veya dokunun"
            accept=".xlsx,.xls,.csv"
            icon="📄"
            onFiles={(fs) => setTransportFile(Array.from(fs)[0] || null)}
          />
          {transportFile && (
            <p className="text-sm text-slate-600 -mt-1">{transportFile.name}</p>
          )}
        </div>

        <div>
          <p className="font-medium text-base text-slate-800 dark:text-slate-100">
            Bilet Ödeme Talep Dosyası
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            Google Form çıktısı (Excel/CSV)
          </p>
          <FileDropzone
            label=""
            hint="xlsx / csv"
            accept=".xlsx,.xls,.csv"
            icon="💳"
            onFiles={(fs) => setPaymentFile(Array.from(fs)[0] || null)}
          />
          {paymentFile && (
            <p className="text-sm text-slate-600 -mt-1">{paymentFile.name}</p>
          )}
        </div>

        <div>
          <p className="font-medium text-base text-slate-800 dark:text-slate-100">
            Fatura PDF&apos;leri
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            Opsiyonel — ödeme dosyasında Drive linki yoksa yükleyin (satır sırası
            veya dosya adında TC ile eşleşir)
          </p>
          <FileDropzone
            label=""
            hint="Çoklu PDF"
            accept=".pdf"
            multiple
            icon="🧾"
            onFiles={addInvoices}
          />
          {invoices.length > 0 && (
            <ul className="space-y-2 mt-2">
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
        </div>

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
