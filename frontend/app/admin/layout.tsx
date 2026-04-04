"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearTokens, getAccessToken } from "@/lib/api";

const nav = [
  { href: "/admin/dashboard", label: "Özet" },
  { href: "/admin/rules", label: "Kurallar" },
  { href: "/admin/modules", label: "Modüller" },
  { href: "/admin/competitions", label: "Yarışmalar" },
  { href: "/admin/reports", label: "Raporlar" },
  { href: "/admin/users", label: "Kullanıcılar" },
  { href: "/admin/audit", label: "Audit" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setReady(true);
      return;
    }
    if (!getAccessToken()) {
      router.replace("/admin/login");
      return;
    }
    setReady(true);
  }, [pathname, router]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-slate-500">
        Yükleniyor…
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950">
      <aside className="md:w-56 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <p className="font-bold text-sky-600 mb-4">TEKNOFEST Admin</p>
        <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap min-h-[44px] inline-flex items-center px-3 rounded-lg text-base ${
                pathname.startsWith(n.href)
                  ? "bg-sky-100 dark:bg-sky-900 text-sky-800"
                  : "text-slate-700 dark:text-slate-200"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="mt-6 text-base text-red-600 min-h-[44px]"
          onClick={() => {
            clearTokens();
            router.replace("/admin/login");
          }}
        >
          Çıkış
        </button>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
    </div>
  );
}
