"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("Theme");

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="theme">
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const next =
    theme === "system"
      ? resolvedTheme === "dark"
        ? "light"
        : "dark"
      : theme === "dark"
        ? "light"
        : "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10"
      type="button"
      title={t("system")}
      onClick={() => setTheme(next)}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}
