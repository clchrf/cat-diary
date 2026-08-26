"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HomeRoom, HOME_CAT_SIZE } from "@/components/home/HomeRoom";
import { PageHeader } from "@/components/shared/PageHeader";
import { getMedicationByDateKey, markMedicationTaken } from "@/lib/db";
import { todayKey, isPastHourToday } from "@/lib/date";

const REMINDER_HOUR = 22;

export default function HomePage() {
  const [medTakenToday, setMedTakenToday] = useState(false);
  const [medBusy, setMedBusy] = useState(false);
  const [checkedToday, setCheckedToday] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const spacerRef = useRef<HTMLDivElement | null>(null);
  const [defaultCatPosition, setDefaultCatPosition] = useState<{ x: number; y: number } | undefined>();

  async function refresh() {
    const meds = await getMedicationByDateKey(todayKey());
    setMedTakenToday(meds.length > 0);
    setCheckedToday(true);
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
    await markMedicationTaken(todayKey());
    await refresh();
    setMedBusy(false);
  }

  // Sleeping is driven only by "today's medication is taken or not" — never
  // by "not recorded yet". Before the daily reminder hour the cat stays
  // awake regardless; only once it's past that hour and still unrecorded
  // does it settle into a quiet rest, and it wakes the moment it's marked.
  const sleeping = checkedToday && !medTakenToday && isPastHourToday(REMINDER_HOUR);

  return (
    <main
      ref={containerRef}
      className="relative flex flex-col items-center overflow-hidden px-6"
      style={{
        touchAction: "none",
        height: "calc(100dvh - var(--safe-top) - var(--bottom-nav-height) - var(--safe-bottom))",
      }}
    >
      <PageHeader title="貓貓日記" />

      <HomeRoom
        containerRef={containerRef}
        defaultPosition={defaultCatPosition}
        sleeping={sleeping}
      />

      {/*
        justify-end (not justify-center) anchors the buttons a fixed
        distance above the bottom edge of this main — which is already
        exactly the bottom nav's own top edge, see the height calc above —
        instead of centering them in the remaining space. Centering here
        was the actual root cause of "buttons still too high": each prior
        margin-top bump only partially moved them, because justify-center
        pulls the block back toward the middle regardless of the margin
        added above it. justify-end makes the vertical position directly
        controlled by pb-10 below, not fought over by two layout rules.
      */}
      <div className="flex flex-1 flex-col items-center justify-end gap-10 w-full max-w-xs pb-10">
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
            {medTakenToday ? "✓ 已記錄" : "記錄吃藥"}
          </button>
        </div>
      </div>
    </main>
  );
}
