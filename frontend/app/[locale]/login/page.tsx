"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ParticipantHeader } from "@/components/layout/participant-header";
import { FadeUp } from "@/components/motion/fade-up";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_BASE } from "@/lib/constants";
import { setParticipantTokens } from "@/lib/auth-tokens";

export default function LoginPage() {
  const t = useTranslations("Login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [tc, setTc] = useState("");
  const [teamId, setTeamId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestMagic() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/magic-link/request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr((data as { detail?: string }).detail || t("error"));
        return;
      }
      if ((data as { token?: string }).token) {
        setToken((data as { token: string }).token);
      }
    } catch {
      setErr(t("error"));
    } finally {
      setLoading(false);
    }
  }

  async function verifyMagic() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/magic-link/verify/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr((data as { detail?: string }).detail || t("error"));
        return;
      }
      setParticipantTokens(data.access, data.refresh);
      router.push("/portal");
    } catch {
      setErr(t("error"));
    } finally {
      setLoading(false);
    }
  }

  async function tcLogin() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tc_id: tc, team_id: teamId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr((data as { detail?: string }).detail || t("error"));
        return;
      }
      setParticipantTokens(data.access, data.refresh);
      router.push("/portal");
    } catch {
      setErr(t("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ParticipantHeader showPortal={false} />
      <main className="mx-auto max-w-lg px-4 py-8 sm:max-w-md">
        <FadeUp>
          <Card className="border-foreground/10 shadow-xl dark:shadow-none">
            <CardHeader>
              <CardTitle>{t("title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="magic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="magic">{t("tabMagic")}</TabsTrigger>
                  <TabsTrigger value="tc">{t("tabTc")}</TabsTrigger>
                </TabsList>
                <TabsContent value="magic" className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={requestMagic}
                    disabled={loading || !email}
                  >
                    {t("requestLink")}
                  </Button>
                  <p className="text-xs text-muted-foreground">{t("magicHint")}</p>
                  <div className="space-y-2">
                    <Label htmlFor="token">{t("token")}</Label>
                    <Input
                      id="token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={verifyMagic}
                    disabled={loading || !token}
                  >
                    {t("verify")}
                  </Button>
                </TabsContent>
                <TabsContent value="tc" className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="tc">{t("tcId")}</Label>
                    <Input id="tc" value={tc} onChange={(e) => setTc(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team">{t("teamId")}</Label>
                    <Input
                      id="team"
                      value={teamId}
                      onChange={(e) => setTeamId(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={tcLogin}
                    disabled={loading || !tc || !teamId}
                  >
                    {t("signIn")}
                  </Button>
                </TabsContent>
              </Tabs>
              {err && (
                <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">
                  {err}
                </p>
              )}
            </CardContent>
          </Card>
        </FadeUp>
      </main>
    </>
  );
}
