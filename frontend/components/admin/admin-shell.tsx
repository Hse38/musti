"use client";

import { useState } from "react";
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Globe,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { clearAdminTokens } from "@/lib/auth-tokens";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/admin/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/admin/competitions", key: "competitions", icon: Trophy },
  { href: "/admin/participants", key: "participants", icon: Users },
  { href: "/admin/invoices", key: "invoices", icon: FileText },
  { href: "/admin/reports", key: "reports", icon: FileSpreadsheet },
  { href: "/admin/settings", key: "settings", icon: Settings },
] as const;

const settingsSubNav = [
  { href: "/admin/rules", key: "rules", icon: Shield },
  { href: "/admin/faq", key: "faq", icon: BookOpen },
  { href: "/admin/languages", key: "languages", icon: Globe },
  { href: "/admin/modules", key: "modules", icon: Layers },
  { href: "/admin/users", key: "users", icon: Users },
  { href: "/admin/notifications", key: "notifications", icon: Megaphone },
  { href: "/admin/audit", key: "audit", icon: Activity },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Admin");
  const [settingsOpen, setSettingsOpen] = useState(() =>
    settingsSubNav.some(
      (item) => pathname === item.href || pathname?.startsWith(`${item.href}/`)
    )
  );

  if (
    pathname?.includes("/admin/login") ||
    pathname === "/admin" ||
    pathname === "/admin/"
  ) {
    return <>{children}</>;
  }

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center gap-2 rounded-lg px-3 py-2.5 text-[15px] transition-colors",
      active
        ? "bg-[#1e293b] text-white ring-1 ring-sky-500/40"
        : "text-slate-300 hover:bg-[#1e293b]/80 hover:text-white"
    );

  return (
    <div className="min-h-dvh bg-[#0f172a] text-slate-100">
      <div className="flex min-h-dvh flex-col md:flex-row">
        <aside className="border-b border-slate-700/50 bg-[#0f172a] p-4 md:w-60 md:border-b-0 md:border-e md:border-slate-700/50">
          <div className="mb-6 text-lg font-semibold tracking-tight text-white">
            TF Admin
          </div>
          <nav className="flex flex-col gap-0.5">
            {mainNav.map(({ href, key, icon: Icon }) => {
              const active =
                href === "/admin/dashboard"
                  ? pathname === href
                  : pathname === href || Boolean(pathname?.startsWith(`${href}/`));
              if (href === "/admin/settings") {
                const subActive = settingsSubNav.some(
                  (s) => pathname === s.href || pathname?.startsWith(`${s.href}/`)
                );
                return (
                  <div key={href} className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      className={linkClass(active || subActive)}
                      onClick={() => setSettingsOpen((o) => !o)}
                    >
                      {settingsOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
                      )}
                      <Icon className="h-4 w-4 shrink-0" />
                      {(t as unknown as (s: string) => string)(key)}
                    </button>
                    {settingsOpen && (
                      <div className="ms-2 mt-1 flex flex-col gap-0.5 border-l border-slate-600/50 ps-2">
                        <Link href={href} className={linkClass(pathname === href)}>
                          <Settings className="h-4 w-4 shrink-0 opacity-70" />
                          {(t as unknown as (s: string) => string)("settingsGeneral")}
                        </Link>
                        {settingsSubNav.map(({ href: sh, key: sk, icon: SIcon }) => {
                          const a =
                            pathname === sh || Boolean(pathname?.startsWith(`${sh}/`));
                          return (
                            <Link key={sh} href={sh} className={linkClass(a)}>
                              <SIcon className="h-4 w-4 shrink-0 opacity-70" />
                              {(t as unknown as (s: string) => string)(sk)}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <Link key={href} href={href} className={linkClass(active)}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {(t as unknown as (s: string) => string)(key)}
                </Link>
              );
            })}
          </nav>
          <Button
            variant="ghost"
            className="mt-8 w-full justify-start gap-2 text-[15px] text-slate-300 hover:bg-[#1e293b] hover:text-white"
            onClick={() => {
              clearAdminTokens();
              router.push("/admin/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </Button>
        </aside>
        <div
          className={cn(
            "flex-1 overflow-auto p-5 md:p-8",
            "[&_.rounded-2xl.border]:border-slate-600/50 [&_.rounded-2xl.border]:bg-[#1e293b]",
            "[&_.rounded-2xl.border]:text-slate-100 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white",
            "[&_h3]:text-lg [&_input]:border-slate-600 [&_input]:bg-[#0f172a] [&_input]:text-slate-100",
            "[&_select]:border-slate-600 [&_select]:bg-[#0f172a] [&_label]:text-slate-300"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
