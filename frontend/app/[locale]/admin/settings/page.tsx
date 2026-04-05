"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/http";
import { getAdminAccess } from "@/lib/auth-tokens";

export default function AdminSettingsPage() {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [siteName, setSiteName] = useState("");
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!getAdminAccess()) {
      router.replace("/admin/login");
      return;
    }
    void (async () => {
      const res = await apiFetch("/admin/settings/site/", {}, "admin");
      if (!res.ok) return;
      const d = (await res.json()) as Record<string, string>;
      setSiteName(d.site_name || "");
      setPrimary(d.primary_color || "");
      setSecondary(d.secondary_color || "");
    })();
  }, [router]);

  async function save() {
    const res = await apiFetch("/admin/settings/site/", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site_name: siteName,
        primary_color: primary,
        secondary_color: secondary,
      }),
    }, "admin");
    setSaved(res.ok);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("settings")}</h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Site</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("siteName")}</Label>
            <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("primaryColor")}</Label>
            <Input value={primary} onChange={(e) => setPrimary(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("secondaryColor")}</Label>
            <Input value={secondary} onChange={(e) => setSecondary(e.target.value)} />
          </div>
          <Button onClick={() => void save()}>{t("save")}</Button>
          {saved && <p className="text-sm text-green-600">{t("saved")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
