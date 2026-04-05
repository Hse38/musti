"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function PortalSubnav({ className }: { className?: string }) {
  const t = useTranslations("Portal");
  return (
    <nav
      className={cn(
        "flex flex-wrap gap-2 text-sm",
        className
      )}
    >
      <Link
        href="/portal"
        className="rounded-full border border-foreground/15 px-3 py-1 hover:border-primary/40"
      >
        {t("navWizard")}
      </Link>
      <Link
        href="/portal/transport"
        className="rounded-full border border-foreground/15 px-3 py-1 hover:border-primary/40"
      >
        {t("navTransport")}
      </Link>
      <Link
        href="/portal/transport/plane"
        className="rounded-full border border-foreground/15 px-3 py-1 hover:border-primary/40"
      >
        {t("navPlane")}
      </Link>
      <Link
        href="/portal/transport/invoice"
        className="rounded-full border border-foreground/15 px-3 py-1 hover:border-primary/40"
      >
        {t("navInvoice")}
      </Link>
      <Link
        href="/portal/status"
        className="rounded-full border border-foreground/15 px-3 py-1 hover:border-primary/40"
      >
        {t("status")}
      </Link>
    </nav>
  );
}
