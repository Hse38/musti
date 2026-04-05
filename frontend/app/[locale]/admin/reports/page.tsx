"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_BASE } from "@/lib/constants";
import { getAdminAccess } from "@/lib/auth-tokens";

export default function AdminReportsPage() {
  const t = useTranslations("Admin");

  async function downloadFlights() {
    const tok = getAdminAccess();
    const res = await fetch(`${API_BASE}/admin/reports/flights/`, {
      headers: tok ? { Authorization: `Bearer ${tok}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ucak_listesi.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("reports")}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("flightReport")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void downloadFlights()}>{t("download")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
