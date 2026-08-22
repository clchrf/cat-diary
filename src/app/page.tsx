"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HomeRoom, HOME_CAT_SIZE } from "@/components/home/HomeRoom";
import {
  getEventsByDateKey,
  getMedicationByDateKey,
  getCansTotal,
  recordMedication,
  addCans,
} from "@/lib/db";
import { todayKey, nowIso } from "@/lib/date";
import type { Rect } from "@/lib/roam";

export default function HomePage() {
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [cans, setCans] = useState<number | null>(null);
  const [medTakenToday, setMedTakenToday] = useState(false);
  const [medBusy, setMedBusy] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLHeadingElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const spacerRef = useRef<HTMLDivElement | null>(null);
  const [blockedRects, setBlockedRects] = useState<Rect[]>([]);
  const [defaultCatPosition, setDefaultCatPosition] = useState<{ x: number; y: number } | undefined>();

  async function refresh() {
    const key = todayKey();
    const [events, meds, canTotal] = await Promise.all([
      getEventsByDateKey(key),
      getMedicationByDateKey(key),
      getCansTotal(),
    ]);
    setTodayCount(events.length);
    setMedTakenToday(meds.length > 0);
    setCans(canTotal);
  }

  useEffect(() => {
    refresh();
  }, []);

  const recomputeBlockedRects = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const toRelative = (el: Element, pad = 10): Rect => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left - containerRect.left - pad,
        top: r.top - containerRect.top - pad,
        width: r.width + pad * 2,
        height: r.height + pad * 2,
      };
    };
    const rects: Rect[] = [];
    if (headerRef.current) rects.push(toRelative(headerRef.current));
    if (contentRef.current) rects.push(toRelative(contentRef.current));
    const nav = document.querySelector("nav");
    if (nav) rects.push(toRelative(nav, 0));
    setBlockedRects(rects);

    if (spacerRef.current) {
      const r = spacerRef.current.getBoundingClientRect();
      const maxX = Math.max(1, containerRect.width - HOME_CAT_SIZE);
      const maxY = Math.max(1, containerRect.height - HOME_CAT_SIZE);
      setDefaultCatPosition({
        x: Math.max(0, Math.min(1, (r.left - containerRect.left) / maxX)),
        y: Math.max(0, Math.min(1, (r.top - containerRect.top) / maxY)),
      });
    }
  }, []);

  useEffect(() => {
    recomputeBlockedRects();
    window.addEventListener("resize", recomputeBlockedRects);
    window.addEventListener("orientationchange", recomputeBlockedRects);
    return () => {
      window.removeEventListener("resize", recomputeBlockedRects);
      window.removeEventListener("orientationchange", recomputeBlockedRects);
    };
  }, [recomputeBlockedRects]);

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
    >
      <HomeRoom blockedRects={blockedRects} defaultPosition={defaultCatPosition} />

      <h1 ref={headerRef} className="relative z-10 mt-4 text-[15px] font-medium tracking-wide text-foreground">
        電子貓日記
      </h1>

      <div className="mt-10 flex flex-1 flex-col items-center justify-center gap-10 w-full max-w-xs">
        <div ref={spacerRef} style={{ width: 160, height: 160 }} aria-hidden />

        <div ref={contentRef} className="relative z-10 flex w-full flex-col items-center gap-10">
          <div className="flex w-full flex-col gap-3">
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

          <div className="text-[12px] text-muted tabular-nums">
            今日 {todayCount ?? "…"} 筆　🥫 {cans ?? "…"}
          </div>

          <Link href="/companion" className="text-[12px] text-muted underline underline-offset-2">
            2 分鐘陪伴
          </Link>
        </div>
      </div>
    </main>
  );
}
