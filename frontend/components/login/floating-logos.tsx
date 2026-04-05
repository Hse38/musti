"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { FLOATING_LOGO_PATHS_FALLBACK } from "@/lib/floating-logo-paths";

const TARGET = 18;

function seeded(n: number, salt: number): number {
  const x = Math.sin(n * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function expandPaths(base: string[]): string[] {
  if (base.length === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < TARGET; i++) {
    out.push(base[i % base.length]!);
  }
  return out;
}

export function FloatingLogos() {
  const [manifestPaths, setManifestPaths] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/LOGOLAR/manifest.json", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as unknown;
        if (cancelled) return;
        if (Array.isArray(data)) {
          setManifestPaths(data.filter((p): p is string => typeof p === "string"));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const paths = useMemo(() => {
    const fromManifest = manifestPaths ?? [];
    const merged = Array.from(
      new Set([...fromManifest, ...FLOATING_LOGO_PATHS_FALLBACK])
    );
    return expandPaths(merged);
  }, [manifestPaths]);

  if (paths.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {paths.map((src, i) => {
        const top = 4 + seeded(i, 1) * 78;
        const left = 2 + seeded(i, 2) * 88;
        const w = 36 + Math.floor(seeded(i, 3) * 48);
        const opacity = 0.05 + seeded(i, 4) * 0.055;
        const duration = 8 + seeded(i, 5) * 7;
        const delay = seeded(i, 6) * 6;
        return (
          <div
            key={`${src}-${i}`}
            className="pointer-events-auto absolute transition duration-300 hover:z-10 hover:scale-[1.08] hover:opacity-[0.25]"
            style={{
              top: `${top}%`,
              left: `${left}%`,
              width: w,
              height: w,
              opacity,
              animation: `tf-float-y ${duration}s ease-in-out infinite`,
              animationDelay: `${delay}s`,
            }}
          >
            <Image
              src={src}
              alt=""
              width={w}
              height={w}
              className="object-contain"
              loading="lazy"
              sizes={`${w}px`}
            />
          </div>
        );
      })}
    </div>
  );
}
