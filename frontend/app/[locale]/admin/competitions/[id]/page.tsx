"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/http";
import { getAdminAccess } from "@/lib/auth-tokens";

export default function CompetitionDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [teams, setTeams] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!getAdminAccess()) {
      router.replace("/admin/login");
      return;
    }
    if (!id) return;
    void (async () => {
      const res = await apiFetch(`/admin/competitions/${id}/teams/`, {}, "admin");
      if (res.ok) setTeams((await res.json()) as Record<string, unknown>[]);
    })();
  }, [id, router]);

  return (
    <div className="space-y-4">
      <Link href="/admin/competitions" className="text-sm text-primary">
        ←
      </Link>
      <h1 className="text-2xl font-bold">Competition #{id}</h1>
      <p className="text-sm text-muted-foreground">
        XLSX: POST multipart to{" "}
        <code className="rounded bg-muted px-1">/admin/competitions/{id}/upload-participants/</code>
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {teams.map((team) => (
            <Link
              key={String(team.id)}
              href={`/admin/teams/${team.id}`}
              className="block rounded-lg border border-foreground/10 p-3 hover:border-primary/30"
            >
              <span className="font-medium">{String(team.name)}</span>
              <span className="ms-2 text-xs text-muted-foreground">
                {String(team.team_code)}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
