"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CatSprite } from "@/components/cat/CatSprite";
import { DailyMoodPicker } from "@/components/status/DailyMoodPicker";
import { getEventsByDateKey, getMedicationByDateKey, getDailyMood, saveDailyMood } from "@/lib/db";
import { computeDailyMoodBreakdown } from "@/lib/stats";
import { synthesizeDailySummary } from "@/lib/aiAnalysis";
import { formatFullDateLabel, formatTimeOfDay, nowIso } from "@/lib/date";
import { EMOTION_OPTIONS, type DiaryEvent, type EmotionKey } from "@/lib/types";
import { moodColorFor } from "@/lib/moodColors";
import { MoodDot } from "@/components/shared/MoodDot";

function moodLabel(key?: EmotionKey): string | undefined {
  return key ? EMOTION_OPTIONS.find((o) => o.key === key)?.label : undefined;
}

export default function DayDetailPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = usePromise(params);
  const router = useRouter();
  const [events, setEvents] = useState<DiaryEvent[] | null>(null);
  const [medTaken, setMedTaken] = useState(false);
  const [mood, setMood] = useState<EmotionKey | undefined>(undefined);
  const [secondaryMoods, setSecondaryMoods] = useState<EmotionKey[]>([]);
  const [intensity, setIntensity] = useState<string | undefined>(undefined);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [dayEvents, meds, savedMood] = await Promise.all([
        getEventsByDateKey(date),
        getMedicationByDateKey(date),
        getDailyMood(date),
      ]);
      setEvents(dayEvents);
      setMedTaken(meds.length > 0);
      const breakdown = computeDailyMoodBreakdown(dayEvents);
      setMood(savedMood?.emotionKey ?? breakdown.primaryMood);
      setSecondaryMoods(breakdown.secondaryMoods);
      setIntensity(breakdown.emotionIntensity);

      setAiSummaryLoading(true);
      const summary = await synthesizeDailySummary(dayEvents);
      setAiSummary(summary ?? null);
      setAiSummaryLoading(false);
    })();
  }, [date]);

  async function handleMoodChange(key: EmotionKey) {
    setMood(key);
    await saveDailyMood({ dateKey: date, emotionKey: key, source: "user", updatedAt: nowIso() });
  }

  if (events === null) return null;

  const flaggedEvents = events.filter((e) => e.needsAttention?.flagged);
  const moodColor = moodColorFor(mood);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-5 pb-16 pt-2">
      <div className="flex items-center justify-between py-2">
        <button onClick={() => router.back()} className="-m-2 p-2 text-[16px] text-muted">
          返回
        </button>
        <h1 className="text-[15px] font-medium">{formatFullDateLabel(date)}</h1>
        <div className="w-8" />
      </div>

      <section className="flex flex-col gap-3">
        <span className="text-[13px] text-muted">今日整體心情</span>
        {events.length === 0 ? (
          <p className="text-[14px] text-muted">尚無紀錄</p>
        ) : (
          <>
            <DailyMoodPicker value={mood} onChange={handleMoodChange} />

            <div className="flex flex-col gap-2 rounded-xl border border-divider p-3 text-[13px]">
              <div className="flex items-center gap-2">
                <span className="text-muted">今日情緒</span>
                {moodColor && <MoodDot color={moodColor} />}
                <span>{moodLabel(mood) ?? "無法判斷"}</span>
              </div>
              {secondaryMoods.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted">次要情緒</span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {secondaryMoods.map((key) => (
                      <span key={key} className="flex items-center gap-1.5">
                        <MoodDot color={moodColorFor(key) ?? "var(--muted)"} />
                        {moodLabel(key)}
                      </span>
                    ))}
                  </span>
                </div>
              )}
              {intensity && (
                <div className="flex items-center gap-2">
                  <span className="text-muted">情緒強度</span>
                  <span>{intensity}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-muted">AI 整理</span>
                <span className="text-muted">
                  {aiSummaryLoading ? "整理中…" : aiSummary ?? "尚未整理"}
                </span>
              </div>
            </div>
          </>
        )}
      </section>

      {flaggedEvents.length > 0 && (
        <section className="flex flex-col gap-2 border-t border-divider pt-5">
          <span className="text-[13px] font-medium">⚠️ 需要留意</span>
          {flaggedEvents.map((e) => (
            <Link
              key={e.id}
              href={`/event/${e.id}`}
              className="rounded-xl border border-divider p-3 text-[13px] leading-relaxed"
            >
              {e.needsAttention?.summary ?? "這段紀錄包含可能需要進一步關注的內容。"}
            </Link>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2 border-t border-divider pt-5">
        <span className="text-[13px] text-muted">吃藥</span>
        <div className="flex items-center gap-2">
          {/* Only shown once taken is confirmed — an unrecorded day stays
              plain text, never a sleeping/negative cat. */}
          {medTaken && <CatSprite animation="idle_sit" scale={1.5} fps={3} />}
          <span className="text-[14px]">{medTaken ? "已記錄" : "尚未記錄"}</span>
        </div>
      </section>

      <section className="flex flex-col gap-2 border-t border-divider pt-5">
        <span className="text-[13px] text-muted">當天所有紀錄</span>
        {events.length === 0 ? (
          <p className="text-[14px] text-muted">尚無紀錄</p>
        ) : (
          events.map((e) => (
            <Link
              key={e.id}
              href={`/event/${e.id}`}
              className="flex items-center justify-between border-b border-divider py-3 text-[14px]"
            >
              <span className="truncate pr-3">
                {e.whatHappened?.audioId && !e.whatHappened?.text ? "🎙️ 語音" : e.whatHappened?.text || "（未輸入文字）"}
              </span>
              <span className="shrink-0 text-[12px] text-muted">{formatTimeOfDay(e.createdAt)}</span>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
