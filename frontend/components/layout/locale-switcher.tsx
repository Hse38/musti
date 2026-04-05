"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

const labels: Record<string, string> = {
  tr: "Türkçe",
  en: "English",
  ar: "العربية",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" size="sm" className="gap-1 border-foreground/15">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{labels[locale] ?? locale}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-[100] min-w-[10rem] rounded-xl border border-foreground/10 bg-card p-1 shadow-lg dark:border-foreground/20"
          sideOffset={6}
        >
          {routing.locales.map((loc) => (
            <DropdownMenu.Item
              key={loc}
              className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none hover:bg-muted"
              onSelect={() => router.replace(pathname, { locale: loc })}
            >
              {labels[loc]}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
