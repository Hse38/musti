"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminParticipantsInfoPage() {
  const t = useTranslations("Admin");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("participants")}</h1>
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          <p className="mb-4">{t("selectCompetition")}</p>
          <Link href="/admin/competitions" className="text-primary underline">
            {t("competitions")}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
