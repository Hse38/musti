"use client";

import {
  Activity,
  BookOpen,
  FileSpreadsheet,
  Globe,
  LayoutDashboard,
  Layers,
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

const nav = [
  { href: "/admin/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/admin/competitions", key: "competitions", icon: Trophy },
  { href: "/admin/participants", key: "participants", icon: Users },
  { href: "/admin/reports", key: "reports", icon: FileSpreadsheet },
  { href: "/admin/rules", key: "rules", icon: Shield },
  { href: "/admin/faq", key: "faq", icon: BookOpen },
  { href: "/admin/languages", key: "languages", icon: Globe },
  { href: "/admin/notifications", key: "notifications", icon: Megaphone },
  { href: "/admin/modules", key: "modules", icon: Layers },
  { href: "/admin/users", key: "users", icon: Users },
  { href: "/admin/audit", key: "audit", icon: Activity },
  { href: "/admin/settings", key: "settings", icon: Settings },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Admin");

  if (pathname?.includes("/admin/login")) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="border-b border-foreground/10 bg-card/90 p-4 md:w-56 md:border-b-0 md:border-e dark:border-foreground/15">
        <div className="mb-6 font-semibold tracking-tight">TF Admin</div>
        <nav className="flex flex-wrap gap-1 md:flex-col">
          {nav.map(({ href, key, icon: Icon }) => {
            const active =
              href === "/admin/dashboard"
                ? pathname === href
                : pathname === href || Boolean(pathname?.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {(t as unknown as (s: string) => string)(key)}
              </Link>
            );
          })}
        </nav>
        <Button
          variant="ghost"
          className="mt-6 w-full justify-start gap-2"
          onClick={() => {
            clearAdminTokens();
            router.push("/admin/login");
          }}
        >
          <LogOut className="h-4 w-4" />
          {t("logout")}
        </Button>
      </aside>
      <div className="flex-1 overflow-auto p-4 md:p-8">{children}</div>
    </div>
  );
}
