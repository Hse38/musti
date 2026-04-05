"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ParticipantHeader } from "@/components/layout/participant-header";
import { PortalSubnav } from "@/components/participant/portal-subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/http";
import { getParticipantAccess } from "@/lib/auth-tokens";

type Step = { key: string; done: boolean };

export default function PortalStatusPage() {
  const t = useTranslations("Portal");
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>([]);
  const [name, setName] = useState("");
  const [transportStatus, setTransportStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!getParticipantAccess()) {
      router.replace("/");
      return;
    }
    setLoading(true);
    const [meRes, stRes] = await Promise.all([
      apiFetch("/me/", {}, "participant"),
      apiFetch("/me/status/", {}, "participant"),
    ]);
    if (meRes.status === 401) {
      router.replace("/");
      return;
    }
    const me = await meRes.json();
    const p = (me as { participant?: { full_name?: string } }).participant;
    setName(p?.full_name || "");
    const st = await stRes.json();
    setSteps((st as { steps?: Step[] }).steps || []);
    setTransportStatus((st as { transport_status?: string | null }).transport_status ?? null);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <>
        <ParticipantHeader showLogout />
        <p className="p-8 text-center text-muted-foreground">…</p>
      </>
    );
  }

  return (
    <>
      <ParticipantHeader showLogout />
      <main className="mx-auto max-w-lg space-y-6 px-4 py-6 pb-24 sm:max-w-xl">
        <div>
          <h1 className="text-2xl font-bold">{t("status")}</h1>
          <p className="text-sm text-muted-foreground">{name}</p>
          <PortalSubnav className="mt-3" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("steps")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {steps.map((s) => (
              <div
                key={s.key}
                className="flex justify-between rounded-lg border border-foreground/10 px-3 py-2"
              >
                <span>{t(s.key as "transport")}</span>
                <span className={s.done ? "text-green-600" : "text-muted-foreground"}>
                  {s.done ? "✓" : "—"}
                </span>
              </div>
            ))}
            {transportStatus && (
              <p className="pt-2 text-muted-foreground">
                {t("transportStatus")}: {transportStatus}
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
