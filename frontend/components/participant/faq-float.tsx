"use client";

import { MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { apiFetch } from "@/lib/http";

export function FaqFloat() {
  const t = useTranslations("FaqWidget");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState<{ role: "u" | "a"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!q.trim()) return;
    setLoading(true);
    const userMsg = q.trim();
    setQ("");
    setMessages((m) => [...m, { role: "u", text: userMsg }]);
    try {
      const res = await apiFetch(
        "/faq/ask/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: userMsg }),
        },
        "participant"
      );
      const data = await res.json();
      const answer =
        (data as { answer?: string }).answer || t("close");
      setMessages((m) => [...m, { role: "a", text: answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "a", text: "…" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <motion.button
        type="button"
        className="fixed bottom-5 end-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen(true)}
        aria-label={t("open")}
      >
        <MessageCircle className="h-7 w-7" />
      </motion.button>
      <Sheet open={open} onOpenChange={setOpen} side="bottom">
        <SheetTitle className="text-lg font-semibold">{t("title")}</SheetTitle>
        <SheetDescription className="sr-only">{t("title")}</SheetDescription>
        <div className="flex max-h-[50dvh] flex-col gap-3">
          <div className="flex-1 space-y-2 overflow-y-auto rounded-xl bg-muted/40 p-3 text-sm">
            <AnimatePresence>
              {messages.length === 0 && (
                <p className="text-muted-foreground">{t("placeholder")}</p>
              )}
              {messages.map((m, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={
                    m.role === "u"
                      ? "ms-auto max-w-[90%] rounded-2xl bg-primary px-3 py-2 text-primary-foreground"
                      : "me-auto max-w-[90%] rounded-2xl bg-card px-3 py-2 shadow-sm"
                  }
                >
                  {m.text}
                </motion.p>
              ))}
            </AnimatePresence>
          </div>
          <div className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("placeholder")}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <Button type="button" size="icon" onClick={send} disabled={loading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
