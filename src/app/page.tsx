"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CatStage } from "@/components/cat/CatStage";
import {
  getEventsByDateKey,
  getMedicationByDateKey,
  getCansTotal,
  recordMedication,
  addCans,
} from "@/lib/db";
import { todayKey, nowIso } from "@/lib/date";

export default function HomePage() {
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [cans, setCans] = useState<number | null>(null);
  const [medTakenToday, setMedTakenToday] = useState(false);
  const [medBusy, setMedBusy] = useState(false);

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

  async function handleMedication() {
    if (medTakenToday || medBusy) return;
    setMedBusy(true);
    await recordMedication({ id: crypto.randomUUID(), dateKey: todayKey(), timestamp: nowIso() });
    await addCans(1, "medication");
    await refresh();
    setMedBusy(false);
  }

  return (
    <main className="flex min-h-[calc(100dvh-5rem)] flex-col items-center px-6">
      <h1 className="mt-4 text-[15px] font-medium tracking-wide text-foreground">電子貓日記</h1>

      <div className="flex flex-1 flex-col items-center justify-center gap-10 w-full max-w-xs">
        <CatStage />

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
    </main>
  );
}
