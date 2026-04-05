"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/http";
import { getAdminAccess } from "@/lib/auth-tokens";

export default function TeamParticipantsPage() {
  const params = useParams();
  const teamId = params?.id as string;
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!getAdminAccess()) {
      router.replace("/admin/login");
      return;
    }
    if (!teamId) return;
    void (async () => {
      const res = await apiFetch(`/admin/teams/${teamId}/participants/`, {}, "admin");
      if (res.ok) setRows((await res.json()) as Record<string, unknown>[]);
    })();
  }, [router, teamId]);

  return (
    <div className="space-y-4">
      <Link href="/admin/competitions" className="text-sm text-primary">
        ← Competitions
      </Link>
      <h1 className="text-2xl font-bold">Team #{teamId}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Participants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {rows.map((p) => (
            <div
              key={String(p.id)}
              className="flex flex-wrap justify-between gap-2 rounded-lg border border-foreground/10 p-3"
            >
              <span>{String(p.full_name)}</span>
              <span className="text-muted-foreground">{String(p.tc_id)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
