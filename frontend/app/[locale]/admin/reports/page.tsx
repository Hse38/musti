"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE } from "@/lib/constants";
import { getAdminAccess } from "@/lib/auth-tokens";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminReportsPage() {
  const t = useTranslations("Admin");
  const [competitionId, setCompetitionId] = useState("");

  async function getFile(path: string, filename: string) {
    const tok = getAdminAccess();
    const res = await fetch(`${API_BASE}${path}`, {
      headers: tok ? { Authorization: `Bearer ${tok}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    downloadBlob(blob, filename);
  }

  function needCompetition(): string | null {
    const id = competitionId.trim();
    if (!id) return null;
    return id;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("reports")}</h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">{t("competitionIdHint")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>competition_id</Label>
          <Input value={competitionId} onChange={(e) => setCompetitionId(e.target.value)} />
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("flightReport")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                const q = competitionId.trim()
                  ? `?competition_id=${competitionId.trim()}`
                  : "";
                void getFile(`/admin/reports/flights/${q}`, "ucak_listesi.xlsx");
              }}
            >
              {t("download")}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("resultReport")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              disabled={!needCompetition()}
              onClick={() => {
                const id = needCompetition();
                if (!id) return;
                void getFile(`/admin/reports/result/?competition_id=${id}`, "sonuc_raporu.xlsx");
              }}
            >
              {t("download")}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("paymentReport")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              disabled={!needCompetition()}
              onClick={() => {
                const id = needCompetition();
                if (!id) return;
                void getFile(`/admin/reports/payment/?competition_id=${id}`, "odeme_raporu.xlsx");
              }}
            >
              {t("download")}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("trackingReport")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              disabled={!needCompetition()}
              onClick={() => {
                const id = needCompetition();
                if (!id) return;
                void getFile(`/admin/reports/tracking/?competition_id=${id}`, "takip_raporu.xlsx");
              }}
            >
              {t("download")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
