"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { ParticipantHeader } from "@/components/layout/participant-header";
import { FaqFloat } from "@/components/participant/faq-float";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/http";
import { getParticipantAccess } from "@/lib/auth-tokens";

type Step = { key: string; done: boolean };

export default function PortalPage() {
  const t = useTranslations("Portal");
  const router = useRouter();
  const [participant, setParticipant] = useState<Record<string, unknown> | null>(
    null
  );
  const [steps, setSteps] = useState<Step[]>([]);
  const [selType, setSelType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [dates, setDates] = useState({
    preferred_arrival_date: "",
    preferred_departure_date: "",
    flight_notes: "",
  });
  const [bank, setBank] = useState({
    origin_city: "",
    bank_name: "",
    account_holder_name: "",
    iban: "",
    phone: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [invoices, setInvoices] = useState<
    { id: number; status: string; amount: string; confidence: number | null }[]
  >([]);

  const load = useCallback(async () => {
    const tok = getParticipantAccess();
    if (!tok) {
      router.replace("/");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const [meRes, stRes, invRes] = await Promise.all([
        apiFetch("/me/", {}, "participant"),
        apiFetch("/me/status/", {}, "participant"),
        apiFetch("/invoices/", {}, "participant"),
      ]);
      if (meRes.status === 401) {
        router.replace("/");
        return;
      }
      const me = await meRes.json();
      const p = (me as { participant?: unknown }).participant;
      if (!p) {
        setParticipant(null);
        setErr(t("notParticipant"));
        setLoading(false);
        return;
      }
      const part = p as Record<string, unknown>;
      setParticipant(part);
      const st = await stRes.json();
      setSteps((st as { steps?: Step[] }).steps || []);
      const pid = String(part.id ?? "");
      const stored =
        typeof window !== "undefined"
          ? localStorage.getItem(`tf_transport_${pid}`) ||
            sessionStorage.getItem("tf_transport_type")
          : null;
      if (stored) setSelType(stored);
      const invData = invRes.ok ? await invRes.json() : [];
      setInvoices(Array.isArray(invData) ? invData : []);
    } catch {
      setErr(t("needLogin"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function selectTransport(tt: string) {
    setErr(null);
    const res = await apiFetch(
      "/transport/select/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transport_type: tt }),
      },
      "participant"
    );
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr((d as { detail?: string }).detail || "Error");
      return;
    }
    sessionStorage.setItem("tf_transport_type", tt);
    const pid = participant?.id;
    if (pid != null && typeof window !== "undefined") {
      localStorage.setItem(`tf_transport_${pid}`, tt);
    }
    setSelType(tt);
    await load();
  }

  async function saveDetails() {
    setErr(null);
    let body: Record<string, string> = {};
    if (selType === "plane") {
      body = {
        preferred_arrival_date: dates.preferred_arrival_date,
        preferred_departure_date: dates.preferred_departure_date,
        flight_notes: dates.flight_notes,
      };
    } else if (selType === "bus" || selType === "train") {
      body = { ...bank };
    }
    const res = await apiFetch(
      "/transport/details/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      "participant"
    );
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr((d as { detail?: string }).detail || "Error");
      return;
    }
    await load();
  }

  async function saveSelf() {
    const res = await apiFetch(
      "/transport/details/",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      "participant"
    );
    if (res.ok) await load();
  }

  async function uploadInvoice() {
    if (!file) return;
    setErr(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await apiFetch("/invoices/upload/", { method: "POST", body: fd }, "participant");
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr((d as { detail?: string }).detail || "Error");
      return;
    }
    setFile(null);
    await load();
  }

  const transportDone = steps.find((s) => s.key === "transport")?.done;
  const detailsDone = steps.find((s) => s.key === "details")?.done;
  const invoiceDone = steps.find((s) => s.key === "invoice")?.done;

  if (loading) {
    return (
      <>
        <ParticipantHeader showLogout />
        <p className="p-8 text-center text-muted-foreground">…</p>
      </>
    );
  }

  if (!participant) {
    return (
      <>
        <ParticipantHeader />
        <p className="p-8 text-center text-red-600">{err}</p>
      </>
    );
  }

  return (
    <>
      <ParticipantHeader showLogout />
      <main className="mx-auto max-w-lg space-y-6 px-4 py-6 pb-24 sm:max-w-xl">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {(participant.full_name as string) ?? ""}
          </p>
        </div>

        <div className="flex gap-2">
          {["transport", "details", "invoice"].map((k, i) => {
            const done =
              k === "transport"
                ? transportDone
                : k === "details"
                  ? detailsDone
                  : invoiceDone;
            return (
              <div key={k} className="flex flex-1 flex-col items-center gap-1">
                <motion.div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ${
                    done
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                  layout
                >
                  {i + 1}
                </motion.div>
                <span className="text-center text-[10px] text-muted-foreground sm:text-xs">
                  {t(k as "transport")}
                </span>
              </div>
            );
          })}
        </div>

        {err && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {err}
          </p>
        )}

        {!transportDone && (
          <Card>
            <CardHeader>
              <CardTitle>{t("transport")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {(
                [
                  ["plane", t("plane")],
                  ["bus", t("bus")],
                  ["train", t("train")],
                  ["self", t("self")],
                ] as const
              ).map(([v, label]) => (
                <Button
                  key={v}
                  variant={selType === v ? "default" : "outline"}
                  className="h-auto min-h-14 flex-col py-3"
                  onClick={() => void selectTransport(v)}
                >
                  {label}
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {transportDone && !detailsDone && selType && selType !== "self" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <CardHeader>
                <CardTitle>{t("details")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selType === "plane" && (
                  <>
                    <div className="space-y-2">
                      <Label>{t("arrival")}</Label>
                      <Input
                        type="date"
                        value={dates.preferred_arrival_date}
                        onChange={(e) =>
                          setDates((d) => ({
                            ...d,
                            preferred_arrival_date: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("departure")}</Label>
                      <Input
                        type="date"
                        value={dates.preferred_departure_date}
                        onChange={(e) =>
                          setDates((d) => ({
                            ...d,
                            preferred_departure_date: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("notes")}</Label>
                      <Input
                        value={dates.flight_notes}
                        onChange={(e) =>
                          setDates((d) => ({ ...d, flight_notes: e.target.value }))
                        }
                      />
                    </div>
                    <Button className="w-full" onClick={() => void saveDetails()}>
                      {t("savePlane")}
                    </Button>
                  </>
                )}
                {(selType === "bus" || selType === "train") && (
                  <>
                    {(
                      [
                        ["origin_city", t("originCity")],
                        ["bank_name", t("bankName")],
                        ["account_holder_name", t("accountHolder")],
                        ["iban", t("iban")],
                        ["phone", t("phone")],
                      ] as const
                    ).map(([key, lab]) => (
                      <div key={key} className="space-y-2">
                        <Label>{lab}</Label>
                        <Input
                          value={bank[key]}
                          onChange={(e) =>
                            setBank((b) => ({ ...b, [key]: e.target.value }))
                          }
                        />
                      </div>
                    ))}
                    <Button className="w-full" onClick={() => void saveDetails()}>
                      {t("saveBank")}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {transportDone && selType === "self" && !detailsDone && (
          <Card>
            <CardContent className="pt-6">
              <p className="mb-4 text-sm text-muted-foreground">{t("selfNote")}</p>
              <Button className="w-full" onClick={() => void saveSelf()}>
                {t("saveSelf")}
              </Button>
            </CardContent>
          </Card>
        )}

        {detailsDone && selType && selType !== "plane" && (
          <Card>
            <CardHeader>
              <CardTitle>{t("invoice")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button
                className="w-full"
                disabled={!file}
                onClick={() => void uploadInvoice()}
              >
                {t("uploadInvoice")}
              </Button>
            </CardContent>
          </Card>
        )}

        {selType === "plane" && detailsDone && (
          <p className="text-sm text-muted-foreground">{t("noInvoicePlane")}</p>
        )}

        {invoices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("yourInvoices")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex justify-between rounded-lg border border-foreground/10 px-3 py-2"
                >
                  <span>#{inv.id}</span>
                  <span>{inv.status}</span>
                  <span className="text-muted-foreground">{inv.amount}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Button variant="outline" className="w-full" onClick={() => void load()}>
          {t("refresh")}
        </Button>
      </main>
      <FaqFloat />
    </>
  );
}
