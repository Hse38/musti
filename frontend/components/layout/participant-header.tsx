"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { clearParticipantTokens } from "@/lib/auth-tokens";

export function ParticipantHeader({
  showPortal = true,
  showLogout = false,
}: {
  showPortal?: boolean;
  showLogout?: boolean;
}) {
  const t = useTranslations("Nav");
  const router = useRouter();

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-40 border-b border-foreground/10 bg-card/80 backdrop-blur-md dark:border-foreground/15"
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3 sm:max-w-2xl">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="rounded-lg bg-primary/10 px-2 py-1 text-primary">TF</span>
          <span className="text-sm sm:text-base">{t("brand")}</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          {showPortal && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/portal">{t("portal")}</Link>
            </Button>
          )}
          <ThemeToggle />
          <LocaleSwitcher />
          {showLogout && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearParticipantTokens();
                router.push("/login");
              }}
            >
              {t("logout")}
            </Button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
