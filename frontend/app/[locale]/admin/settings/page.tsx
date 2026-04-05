"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/http";
import { getAdminAccess } from "@/lib/auth-tokens";

type SitePayload = Record<string, string | number | boolean>;

export default function AdminSettingsPage() {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<SitePayload>({
    site_name: "",
    primary_color: "",
    secondary_color: "",
    support_email: "",
    support_phone: "",
    smtp_host: "",
    smtp_port: 587,
    smtp_user: "",
    smtp_password: "",
    smtp_use_tls: true,
    email_from_name: "",
    magic_link_subject: "",
    magic_link_body: "",
    invoice_approved_subject: "",
    invoice_approved_body: "",
    invoice_rejected_subject: "",
    invoice_rejected_body: "",
    reminder_subject: "",
    reminder_body: "",
  });

  useEffect(() => {
    if (!getAdminAccess()) {
      router.replace("/admin/login");
      return;
    }
    void (async () => {
      const res = await apiFetch("/admin/settings/site/", {}, "admin");
      if (!res.ok) return;
      const d = (await res.json()) as SitePayload;
      setForm((prev) => ({ ...prev, ...d }));
    })();
  }, [router]);

  function set<K extends keyof SitePayload>(key: K, value: SitePayload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    const body: SitePayload = { ...form };
    if (!String(body.smtp_password || "").trim()) {
      delete body.smtp_password;
    }
    const res = await apiFetch("/admin/settings/site/", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, "admin");
    setSaved(res.ok);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("settings")}</h1>
      <Tabs defaultValue="branding" className="w-full">
        <TabsList>
          <TabsTrigger value="branding">{t("tabBranding")}</TabsTrigger>
          <TabsTrigger value="smtp">SMTP</TabsTrigger>
          <TabsTrigger value="mail">{t("mailTemplates")}</TabsTrigger>
        </TabsList>
        <TabsContent value="branding" className="mt-4">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle className="text-base">Site</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("siteName")}</Label>
                <Input
                  value={String(form.site_name ?? "")}
                  onChange={(e) => set("site_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("primaryColor")}</Label>
                <Input
                  value={String(form.primary_color ?? "")}
                  onChange={(e) => set("primary_color", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("secondaryColor")}</Label>
                <Input
                  value={String(form.secondary_color ?? "")}
                  onChange={(e) => set("secondary_color", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>support_email</Label>
                <Input
                  value={String(form.support_email ?? "")}
                  onChange={(e) => set("support_email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>support_phone</Label>
                <Input
                  value={String(form.support_phone ?? "")}
                  onChange={(e) => set("support_phone", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="smtp" className="mt-4">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle className="text-base">SMTP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("smtpHost")}</Label>
                <Input
                  value={String(form.smtp_host ?? "")}
                  onChange={(e) => set("smtp_host", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("smtpPort")}</Label>
                <Input
                  type="number"
                  value={String(form.smtp_port ?? "")}
                  onChange={(e) => set("smtp_port", Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("smtpUser")}</Label>
                <Input
                  value={String(form.smtp_user ?? "")}
                  onChange={(e) => set("smtp_user", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("smtpPassword")}</Label>
                <Input
                  type="password"
                  value={String(form.smtp_password ?? "")}
                  onChange={(e) => set("smtp_password", e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tls"
                  checked={Boolean(form.smtp_use_tls)}
                  onChange={(e) => set("smtp_use_tls", e.target.checked)}
                />
                <Label htmlFor="tls">{t("smtpTls")}</Label>
              </div>
              <div className="space-y-2">
                <Label>{t("emailFromName")}</Label>
                <Input
                  value={String(form.email_from_name ?? "")}
                  onChange={(e) => set("email_from_name", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="mail" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Magic link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={String(form.magic_link_subject ?? "")}
                  onChange={(e) => set("magic_link_subject", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  className="min-h-[120px] font-mono text-sm"
                  value={String(form.magic_link_body ?? "")}
                  onChange={(e) => set("magic_link_body", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice approved</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={String(form.invoice_approved_subject ?? "")}
                onChange={(e) => set("invoice_approved_subject", e.target.value)}
              />
              <Textarea
                className="min-h-[120px] font-mono text-sm"
                value={String(form.invoice_approved_body ?? "")}
                onChange={(e) => set("invoice_approved_body", e.target.value)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice rejected</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={String(form.invoice_rejected_subject ?? "")}
                onChange={(e) => set("invoice_rejected_subject", e.target.value)}
              />
              <Textarea
                className="min-h-[120px] font-mono text-sm"
                value={String(form.invoice_rejected_body ?? "")}
                onChange={(e) => set("invoice_rejected_body", e.target.value)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reminder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={String(form.reminder_subject ?? "")}
                onChange={(e) => set("reminder_subject", e.target.value)}
              />
              <Textarea
                className="min-h-[120px] font-mono text-sm"
                value={String(form.reminder_body ?? "")}
                onChange={(e) => set("reminder_body", e.target.value)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Button onClick={() => void save()}>{t("save")}</Button>
      {saved && <p className="text-sm text-green-600">{t("saved")}</p>}
    </div>
  );
}
