"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarView, type DayCellData } from "@/components/status/CalendarView";
import { PromptPanel } from "@/components/shared/PromptPanel";
import { PageHeader } from "@/components/shared/PageHeader";
import { MoodDot } from "@/components/shared/MoodDot";
import { getEventsInDateKeys, getMedicationInDateKeys, getDailyMoodsInDateKeys } from "@/lib/db";
import { dateKeysInRange, formatDateLabel, formatMonthLabel, formatTimeOfDay, monthDateKeys, todayKey } from "@/lib/date";
import { buildRangePrompt } from "@/lib/aiPrompt";
import { computeAutoDailyMood, computeEmotionDistribution, eventsNeedingAttention } from "@/lib/stats";
import { moodColorFor } from "@/lib/moodColors";
import type { DiaryEvent } from "@/lib/types";

export default function StatusPage() {
  const router = useRouter();
  const [today] = useState(() => todayKey());
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)));

  const [events, setEvents] = useState<DiaryEvent[]>([]);
  const [calendarData, setCalendarData] = useState<Record<string, DayCellData>>({});
  const [medDaysCount, setMedDaysCount] = useState(0);

  useEffect(() => {
    const keys = monthDateKeys(year, month);
    Promise.all([
      getEventsInDateKeys(keys),
      getMedicationInDateKeys(keys),
      getDailyMoodsInDateKeys(keys),
    ]).then(([monthEvents, meds, moods]) => {
      setEvents(monthEvents);

      const eventsByDay = new Map<string, DiaryEvent[]>();
      for (const e of monthEvents) {
        const list = eventsByDay.get(e.dateKey) ?? [];
        list.push(e);
        eventsByDay.set(e.dateKey, list);
      }
      const medDateKeys = new Set(meds.map((m) => m.dateKey));
      const moodByDay = new Map(moods.map((m) => [m.dateKey, m.emotionKey]));

      const data: Record<string, DayCellData> = {};
      for (const key of keys) {
        const dayEvents = eventsByDay.get(key) ?? [];
        data[key] = {
          hasEvents: dayEvents.length > 0,
          medTaken: medDateKeys.has(key),
          mood: moodByDay.get(key) ?? (dayEvents.length > 0 ? computeAutoDailyMood(dayEvents) : undefined),
        };
      }
      setCalendarData(data);
      setMedDaysCount(medDateKeys.size);
    });
  }, [year, month]);

  const monthEmotionDist = useMemo(() => computeEmotionDistribution(events), [events]);
  const attention = useMemo(() => eventsNeedingAttention(events), [events]);

  const [recentEvents, setRecentEvents] = useState<DiaryEvent[]>([]);
  useEffect(() => {
    getEventsInDateKeys(dateKeysInRange(30)).then(setRecentEvents);
  }, []);
  const recentEmotionDist = useMemo(() => computeEmotionDistribution(recentEvents), [recentEvents]);

  function handlePrevMonth() {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-5 pb-16 pt-2">
      <PageHeader title="狀況" />

      <CalendarView
        year={year}
        month={month}
        data={calendarData}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onSelectDay={(dateKey) => router.push(`/status/day/${dateKey}`)}
      />

      <section className="flex flex-col gap-1.5 border-t border-divider pt-5 text-[13px] text-muted">
        <div className="flex justify-between">
          <span>本月紀錄</span>
          <span className="text-foreground">{events.length} 次</span>
        </div>
        <div className="flex justify-between">
          <span>吃藥有記錄</span>
          <span className="text-foreground">{medDaysCount} 天</span>
        </div>
        <div className="flex items-center justify-between">
          <span>主要情緒</span>
          <span className="flex items-center gap-1.5 text-foreground">
            {monthEmotionDist[0] ? (
              <>
                <MoodDot color={moodColorFor(monthEmotionDist[0].key) ?? "var(--muted)"} />
                {monthEmotionDist[0].label}
              </>
            ) : (
              "尚無資料"
            )}
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-divider pt-5">
        <PromptPanel
          label="需要 AI 幫忙整理這個月嗎？"
          buildPrompt={() => buildRangePrompt(events, formatMonthLabel(year, month))}
        />
      </section>

      <section className="flex flex-col gap-3 border-t border-divider pt-5">
        <span className="text-[13px] text-muted">最近的我（過去 30 天，共記錄 {recentEvents.length} 次）</span>
        {recentEmotionDist.length === 0 ? (
          <p className="text-[13px] text-muted">尚無資料</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {recentEmotionDist.slice(0, 3).map((e) => (
              <span
                key={e.key}
                className="flex items-center gap-1.5 rounded-full border border-divider px-3 py-1 text-[13px]"
              >
                <MoodDot color={moodColorFor(e.key) ?? "var(--muted)"} />
                {e.label}
              </span>
            ))}
          </div>
        )}
        <PromptPanel
          label="需要 AI 幫忙整理這 30 天嗎？"
          buildPrompt={() => buildRangePrompt(recentEvents, "過去 30 天")}
        />
      </section>

      {attention.length > 0 && (
        <section className="flex flex-col gap-3 border-t border-divider pt-5">
          <span className="text-[13px] font-medium">⚠️ 需要留意</span>
          <div className="flex flex-col gap-2">
            {attention.map((e) => (
              <Link
                key={e.id}
                href={`/event/${e.id}`}
                className="rounded-xl border border-divider p-3 text-[13px] leading-relaxed"
              >
                <div className="text-muted">
                  {formatDateLabel(e.dateKey)} {formatTimeOfDay(e.createdAt)}
                </div>
                <div>{e.needsAttention?.summary ?? "這段紀錄包含可能需要進一步關注的內容。"}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Link href="/settings" className="mt-2 text-center text-[13px] text-muted underline underline-offset-2">
        設定與匯出報告
      </Link>
    </main>
  );
}
