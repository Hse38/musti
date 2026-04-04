"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { API_BASE, setTokens } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError("Giriş başarısız. Kullanıcı adı veya şifre hatalı.");
        setLoading(false);
        return;
      }
      setTokens(data.access, data.refresh);
      router.replace("/admin/dashboard");
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-slate-100 dark:bg-slate-950">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-200 dark:border-slate-800"
      >
        <h1 className="text-xl font-bold mb-6 text-center">Admin Girişi</h1>
        {error && (
          <p className="text-red-600 text-base mb-4" role="alert">
            {error}
          </p>
        )}
        <label className="block text-base mb-2">Kullanıcı adı</label>
        <input
          className="w-full min-h-[48px] text-base border rounded-xl px-3 mb-4 dark:bg-slate-950"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <label className="block text-base mb-2">Şifre</label>
        <input
          type="password"
          className="w-full min-h-[48px] text-base border rounded-xl px-3 mb-6 dark:bg-slate-950"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[48px] rounded-xl bg-sky-600 text-white font-semibold text-base"
        >
          {loading ? "…" : "Giriş"}
        </button>
        <Link href="/" className="block text-center mt-4 text-sky-600 text-base">
          Ana sayfa
        </Link>
      </form>
    </div>
  );
}
