"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HomeRoom, HOME_CAT_SIZE } from "@/components/home/HomeRoom";
import { getMedicationByDateKey, recordMedication, addCans } from "@/lib/db";
import { todayKey, nowIso } from "@/lib/date";

export default function HomePage() {
  const [medTakenToday, setMedTakenToday] = useState(false);
  const [medBusy, setMedBusy] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const spacerRef = useRef<HTMLDivElement | null>(null);
  const [defaultCatPosition, setDefaultCatPosition] = useState<{ x: number; y: number } | undefined>();

  async function refresh() {
    const meds = await getMedicationByDateKey(todayKey());
    setMedTakenToday(meds.length > 0);
  }

  useEffect(() => {
    refresh();
  }, []);

  const computeDefaultCatPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container || !spacerRef.current) return;
    const containerRect = container.getBoundingClientRect();
    const r = spacerRef.current.getBoundingClientRect();
    const maxX = Math.max(1, containerRect.width - HOME_CAT_SIZE);
    const maxY = Math.max(1, containerRect.height - HOME_CAT_SIZE);
    setDefaultCatPosition({
      x: Math.max(0, Math.min(1, (r.left - containerRect.left) / maxX)),
      y: Math.max(0, Math.min(1, (r.top - containerRect.top) / maxY)),
    });
  }, []);

  useEffect(() => {
    computeDefaultCatPosition();
    window.addEventListener("resize", computeDefaultCatPosition);
    window.addEventListener("orientationchange", computeDefaultCatPosition);
    return () => {
      window.removeEventListener("resize", computeDefaultCatPosition);
      window.removeEventListener("orientationchange", computeDefaultCatPosition);
    };
  }, [computeDefaultCatPosition]);

  async function handleMedication() {
    if (medTakenToday || medBusy) return;
    setMedBusy(true);
    await recordMedication({ id: crypto.randomUUID(), dateKey: todayKey(), timestamp: nowIso() });
    await addCans(1, "medication");
    await refresh();
    setMedBusy(false);
  }

  return (
    <main
      ref={containerRef}
      className="relative flex min-h-[calc(100dvh-5rem)] flex-col items-center overflow-hidden px-6"
      style={{ touchAction: "none" }}
    >
      <HomeRoom containerRef={containerRef} defaultPosition={defaultCatPosition} />

      <h1 className="relative z-10 mt-4 text-[15px] font-medium tracking-wide text-foreground">電子貓日記</h1>

      <div className="mt-32 flex flex-1 flex-col items-center justify-center gap-10 w-full max-w-xs">
        <div ref={spacerRef} style={{ width: 160, height: 160 }} aria-hidden />

        <div className="relative z-10 flex w-full flex-col items-center gap-3">
          <Link
            href="/record"
            className="w-full rounded-2xl bg-foreground py-4 text-center text-[16px] font-medium text-background"
          >
            📝 記錄今天
          </Link>
          <button
            onClick={handleMedication}
            disabled={medTakenToday || medBusy}
            className="w-full rounded-2xl border border-divider py-4 text-center text-[16px] font-medium disabled:opacity-50"
            style={{ color: medTakenToday ? "var(--muted)" : "var(--foreground)" }}
          >
            {medTakenToday ? "✓ 已記錄" : "💊 記錄吃藥"}
          </button>
        </div>
      </div>
    </main>
  );
}
