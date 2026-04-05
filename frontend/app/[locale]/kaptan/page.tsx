"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ParticipantHeader } from "@/components/layout/participant-header";
import { FadeUp } from "@/components/motion/fade-up";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/http";
import { getParticipantAccess } from "@/lib/auth-tokens";

type Member = {
  id: number;
  full_name: string;
  tc_id: string;
  onboarding_completed: boolean;
};

export default function KaptanPage() {
  const t = useTranslations("Captain");
  const router = useRouter();
  const [team, setTeam] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [sel, setSel] = useState<number | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!getParticipantAccess()) {
      router.replace("/");
      return;
    }
    void (async () => {
      const res = await apiFetch("/captain/team/", {}, "participant");
      if (res.status === 403) {
        setMsg("403");
        return;
      }
      const data = await res.json();
      setTeam((data as { team?: string }).team || "");
      setMembers((data as { members?: Member[] }).members || []);
    })();
  }, [router]);

  async function upload() {
    if (!sel || !file) return;
    const fd = new FormData();
    fd.append("participant_id", String(sel));
    fd.append("file", file);
    const res = await apiFetch("/captain/upload-invoice/", { method: "POST", body: fd }, "participant");
    setMsg(res.ok ? "ok" : "err");
    if (res.ok) setFile(null);
  }

  return (
    <>
      <ParticipantHeader showPortal showLogout />
      <main className="mx-auto max-w-lg px-4 py-8 sm:max-w-md">
        <FadeUp>
          <Card>
            <CardHeader>
              <CardTitle>{t("title")}</CardTitle>
              {team && <p className="text-sm text-muted-foreground">{team}</p>}
            </CardHeader>
            <CardContent className="space-y-4">
              {msg === "403" && (
                <p className="text-sm text-red-600">Forbidden</p>
              )}
              <div className="space-y-2">
                <Label>{t("pickMember")}</Label>
                <select
                  className="flex h-11 w-full rounded-lg border border-foreground/15 bg-background px-3 text-sm dark:border-foreground/20"
                  value={sel === "" ? "" : String(sel)}
                  onChange={(e) => setSel(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">—</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("uploadFor")}</Label>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <Button className="w-full" disabled={!sel || !file} onClick={() => void upload()}>
                {t("upload")}
              </Button>
            </CardContent>
          </Card>
        </FadeUp>
      </main>
    </>
  );
}
