"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CatSprite } from "@/components/cat/CatSprite";
import { DailyMoodPicker } from "@/components/status/DailyMoodPicker";
import { getEventsByDateKey, getMedicationByDateKey, getDailyMood, saveDailyMood } from "@/lib/db";
import { computeAutoDailyMood } from "@/lib/stats";
import { formatFullDateLabel, formatTimeOfDay, nowIso } from "@/lib/date";
import type { DiaryEvent, EmotionKey } from "@/lib/types";

export default function DayDetailPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = usePromise(params);
  const router = useRouter();
  const [events, setEvents] = useState<DiaryEvent[] | null>(null);
  const [medTaken, setMedTaken] = useState(false);
  const [mood, setMood] = useState<EmotionKey | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const [dayEvents, meds, savedMood] = await Promise.all([
        getEventsByDateKey(date),
        getMedicationByDateKey(date),
        getDailyMood(date),
      ]);
      setEvents(dayEvents);
      setMedTaken(meds.length > 0);
      setMood(savedMood?.emotionKey ?? computeAutoDailyMood(dayEvents));
    })();
  }, [date]);

  async function handleMoodChange(key: EmotionKey) {
    setMood(key);
    await saveDailyMood({ dateKey: date, emotionKey: key, source: "user", updatedAt: nowIso() });
  }

  if (events === null) return null;

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
          <DailyMoodPicker value={mood} onChange={handleMoodChange} />
        )}
      </section>

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
