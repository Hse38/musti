"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ADMIN_WS_PATH, WS_ORIGIN } from "@/lib/constants";
import { getAdminAccess } from "@/lib/auth-tokens";

export default function AdminNotificationsPage() {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [items, setItems] = useState<{ id: number; raw: string }[]>([]);
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const idRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!getAdminAccess()) {
      router.replace("/admin/login");
      return;
    }
    const url = `${WS_ORIGIN.replace(/\/$/, "")}${ADMIN_WS_PATH}`;
    let retry: ReturnType<typeof setTimeout>;
    function connect() {
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => setStatus("ok");
        ws.onmessage = (ev) => {
          idRef.current += 1;
          setItems((prev) => [
            { id: idRef.current, raw: ev.data },
            ...prev.slice(0, 49),
          ]);
        };
        ws.onerror = () => setStatus("err");
        ws.onclose = () => {
          setStatus("idle");
          retry = setTimeout(connect, 4000);
        };
      } catch {
        setStatus("err");
        retry = setTimeout(connect, 4000);
      }
    }
    connect();
    return () => {
      clearTimeout(retry);
      wsRef.current?.close();
    };
  }, [router]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("notifications")}</h1>
      <p className="text-sm text-muted-foreground">
        {status === "ok" && t("wsConnecting").replace("…", " ✓")}
        {status === "idle" && t("wsConnecting")}
        {status === "err" && t("wsError")}
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-xs">
          <AnimatePresence initial={false}>
            {items.map((it) => (
              <motion.pre
                key={it.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-lg bg-muted/50 p-2"
              >
                {it.raw}
              </motion.pre>
            ))}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
