"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { FadeUp } from "@/components/motion/fade-up";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE } from "@/lib/constants";
import { setAdminTokens } from "@/lib/auth-tokens";

export default function AdminLoginPage() {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/jwt/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr("Login failed");
        return;
      }
      setAdminTokens(data.access, data.refresh);
      router.push("/admin/dashboard");
    } catch {
      setErr("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-muted/30 px-4 py-8">
      <div className="mx-auto flex max-w-md justify-end gap-2">
        <ThemeToggle />
        <LocaleSwitcher />
      </div>
      <FadeUp className="mx-auto mt-8 max-w-md">
        <Card className="border-foreground/10 shadow-xl">
          <CardHeader>
            <CardTitle>{t("signIn")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void submit(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="u">{t("username")}</Label>
                <Input
                  id="u"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p">{t("password")}</Label>
                <Input
                  id="p"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {t("login")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </FadeUp>
    </div>
  );
}
