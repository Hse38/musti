import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { routing } from "@/i18n/routing";

type Props = {
  children: React.ReactNode;
  params: { locale: string };
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params: { locale } }: Props) {
  if (!routing.locales.includes(locale as "tr" | "en" | "ar")) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div
          lang={locale}
          dir={locale === "ar" ? "rtl" : "ltr"}
          className="min-h-dvh bg-background text-foreground"
        >
          {children}
        </div>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
