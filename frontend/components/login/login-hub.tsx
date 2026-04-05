"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setAdminTokens, setParticipantTokens } from "@/lib/auth-tokens";
import { API_BASE } from "@/lib/constants";
import { apiFetch } from "@/lib/http";
import { FloatingLogos } from "./floating-logos";

type HubMode = "menu" | "participant" | "admin" | "magic";

const panelMotion = {
  initial: { x: 28, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -28, opacity: 0 },
  transition: { type: "spring" as const, stiffness: 320, damping: 30 },
};

async function routeAfterParticipantAuth(router: ReturnType<typeof useRouter>) {
  const res = await apiFetch("/me/", {}, "participant");
  if (!res.ok) {
    router.push("/portal");
    return;
  }
  const data = (await res.json()) as { participant?: { is_captain?: boolean } };
  const cap = data.participant?.is_captain === true;
  router.push(cap ? "/kaptan" : "/portal");
}

export function LoginHub() {
  const t = useTranslations("LoginHub");
  const tLogin = useTranslations("Login");
  const tAdmin = useTranslations("Admin");
  const router = useRouter();
  const [mode, setMode] = useState<HubMode>("menu");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [tc, setTc] = useState("");
  const [teamId, setTeamId] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [email, setEmail] = useState("");
  const [magicToken, setMagicToken] = useState("");

  async function onParticipantSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        setErr((data as { detail?: string }).detail || tLogin("error"));
        return;
      }
      setParticipantTokens(data.access, data.refresh);
      await routeAfterParticipantAuth(router);
    } catch {
      setErr(tLogin("error"));
    } finally {
      setLoading(false);
    }
  }

  async function onAdminSubmit(e: React.FormEvent) {
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
        setErr(t("adminError"));
        return;
      }
      setAdminTokens(data.access, data.refresh);
      router.push("/admin/dashboard");
    } catch {
      setErr(t("adminError"));
    } finally {
      setLoading(false);
    }
  }

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
        setErr((data as { detail?: string }).detail || tLogin("error"));
        return;
      }
      if ((data as { token?: string }).token) {
        setMagicToken((data as { token: string }).token);
      }
    } catch {
      setErr(tLogin("error"));
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
        body: JSON.stringify({ token: magicToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr((data as { detail?: string }).detail || tLogin("error"));
        return;
      }
      setParticipantTokens(data.access, data.refresh);
      await routeAfterParticipantAuth(router);
    } catch {
      setErr(tLogin("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tf-login-screen relative text-white">
      <FloatingLogos />
      <div className="pointer-events-none fixed right-3 top-3 z-50 flex gap-2 sm:right-4 sm:top-4">
        <div className="pointer-events-auto flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </div>

      <div className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6">
        <motion.div
          className="tf-glass-card w-full max-w-lg p-[clamp(1.5rem,5vw,3rem)] shadow-2xl shadow-black/40"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <Image
              src="/analogo.png"
              alt=""
              width={120}
              height={120}
              className="h-auto w-[120px] max-w-full object-contain"
              priority
            />
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              {t("title")}
            </h1>
            <div className="mx-auto mt-4 w-full max-w-xs">
              <div className="tf-separator-line" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {mode === "menu" && (
              <motion.div
                key="menu"
                {...panelMotion}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  <button
                    type="button"
                    className="tf-btn-participant rounded-xl px-4 py-3.5 text-center text-sm font-semibold shadow-lg transition sm:py-4 sm:text-base"
                    onClick={() => {
                      setErr(null);
                      setMode("participant");
                    }}
                  >
                    {t("participantCta")}
                  </button>
                  <button
                    type="button"
                    className="tf-btn-admin-outline rounded-xl px-4 py-3.5 text-center text-sm font-semibold sm:py-4 sm:text-base"
                    onClick={() => {
                      setErr(null);
                      setMode("admin");
                    }}
                  >
                    {t("adminCta")}
                  </button>
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-tf-accent underline-offset-4 hover:underline"
                    onClick={() => {
                      setErr(null);
                      setMode("magic");
                    }}
                  >
                    {t("magicCta")}
                  </button>
                </div>
              </motion.div>
            )}

            {mode === "participant" && (
              <motion.div key="participant" {...panelMotion} className="space-y-4">
                <h2 className="text-lg font-semibold">{t("participantTitle")}</h2>
                <form className="space-y-4" onSubmit={(e) => void onParticipantSubmit(e)}>
                  <div className="space-y-2">
                    <Label htmlFor="hub-tc" className="text-white/90">
                      {tLogin("tcId")}
                    </Label>
                    <Input
                      id="hub-tc"
                      className="border-white/20 bg-white/5 text-white placeholder:text-white/40"
                      value={tc}
                      onChange={(e) => setTc(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hub-team" className="text-white/90">
                      {tLogin("teamId")}
                    </Label>
                    <Input
                      id="hub-team"
                      className="border-white/20 bg-white/5 text-white placeholder:text-white/40"
                      value={teamId}
                      onChange={(e) => setTeamId(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full tf-btn-participant border-0"
                    disabled={loading || !tc || !teamId}
                  >
                    {tLogin("signIn")}
                  </Button>
                </form>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-white/80 hover:bg-white/10 hover:text-white"
                  onClick={() => setMode("menu")}
                >
                  {t("back")}
                </Button>
              </motion.div>
            )}

            {mode === "admin" && (
              <motion.div key="admin" {...panelMotion} className="space-y-4">
                <h2 className="text-lg font-semibold">{t("adminTitle")}</h2>
                <form className="space-y-4" onSubmit={(e) => void onAdminSubmit(e)}>
                  <div className="space-y-2">
                    <Label htmlFor="hub-u" className="text-white/90">
                      {tAdmin("username")}
                    </Label>
                    <Input
                      id="hub-u"
                      autoComplete="username"
                      className="border-white/20 bg-white/5 text-white placeholder:text-white/40"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hub-p" className="text-white/90">
                      {tAdmin("password")}
                    </Label>
                    <Input
                      id="hub-p"
                      type="password"
                      autoComplete="current-password"
                      className="border-white/20 bg-white/5 text-white placeholder:text-white/40"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full tf-btn-admin-outline"
                    disabled={loading || !username || !password}
                  >
                    {tAdmin("login")}
                  </Button>
                </form>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-white/80 hover:bg-white/10 hover:text-white"
                  onClick={() => setMode("menu")}
                >
                  {t("back")}
                </Button>
              </motion.div>
            )}

            {mode === "magic" && (
              <motion.div key="magic" {...panelMotion} className="space-y-4">
                <h2 className="text-lg font-semibold">{t("magicTitle")}</h2>
                <div className="space-y-2">
                  <Label htmlFor="hub-email" className="text-white/90">
                    {tLogin("email")}
                  </Label>
                  <Input
                    id="hub-email"
                    type="email"
                    autoComplete="email"
                    className="border-white/20 bg-white/5 text-white placeholder:text-white/40"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  className="w-full tf-btn-participant border-0"
                  onClick={() => void requestMagic()}
                  disabled={loading || !email}
                >
                  {tLogin("requestLink")}
                </Button>
                <p className="text-xs text-white/55">{tLogin("magicHint")}</p>
                <div className="space-y-2">
                  <Label htmlFor="hub-token" className="text-white/90">
                    {tLogin("token")}
                  </Label>
                  <Input
                    id="hub-token"
                    className="border-white/20 bg-white/5 text-white placeholder:text-white/40"
                    value={magicToken}
                    onChange={(e) => setMagicToken(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => void verifyMagic()}
                  disabled={loading || !magicToken}
                >
                  {tLogin("verify")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-white/80 hover:bg-white/10 hover:text-white"
                  onClick={() => setMode("menu")}
                >
                  {t("back")}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {err && (
            <p className="mt-4 text-center text-sm text-red-400" role="alert">
              {err}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
