import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ParticipantHeader } from "@/components/layout/participant-header";
import { FadeUp } from "@/components/motion/fade-up";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function HomePage() {
  const t = await getTranslations("Home");

  return (
    <>
      <ParticipantHeader showPortal={false} />
      <main className="mx-auto max-w-lg px-4 py-10 sm:max-w-xl">
        <FadeUp className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("title")}
            </h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Card className="overflow-hidden border-foreground/10 shadow-lg dark:shadow-none">
            <CardContent className="flex flex-col gap-3 p-6">
              <Button size="lg" className="w-full rounded-xl" asChild>
                <Link href="/login">{t("participantCta")}</Link>
              </Button>
              <Button size="lg" variant="secondary" className="w-full rounded-xl" asChild>
                <Link href="/captain">{t("captainCta")}</Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full rounded-xl" asChild>
                <Link href="/admin/login">{t("adminCta")}</Link>
              </Button>
            </CardContent>
          </Card>
        </FadeUp>
      </main>
    </>
  );
}
