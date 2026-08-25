"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAllEvents } from "@/lib/db";
import { formatDateLabel, formatTimeOfDay } from "@/lib/date";
import type { DiaryEvent } from "@/lib/types";

function eventSearchText(e: DiaryEvent): string {
  return [
    e.whatHappened?.text,
    e.firstReaction?.text,
    e.wantToDo?.text,
    e.displayedMindset?.text,
    e.howHandled?.text,
    e.emotionsCustom,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function entryKind(e: DiaryEvent): string {
  return e.whatHappened?.audioId && !e.whatHappened?.text ? "🎙️ 語音日記" : "✏️ 文字紀錄";
}

export default function ReviewPage() {
  const [events, setEvents] = useState<DiaryEvent[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getAllEvents().then(setEvents);
  }, []);

  const filtered = useMemo(() => {
    if (!events) return [];
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => eventSearchText(e).includes(q));
  }, [events, query]);

  const groups = useMemo(() => {
    const map = new Map<string, DiaryEvent[]>();
    for (const e of filtered) {
      const list = map.get(e.dateKey) ?? [];
      list.push(e);
      map.set(e.dateKey, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-5 pb-16 pt-6">
      <h1 className="text-[17px] font-semibold">回顧</h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜尋我的紀錄"
        className="w-full rounded-xl border border-divider bg-transparent p-3 text-[14px] placeholder:text-muted focus:outline-none"
      />

      {events === null ? null : groups.length === 0 ? (
        <p className="pt-6 text-center text-[13px] text-muted">
          {query.trim() ? "沒有符合的紀錄" : "尚無紀錄"}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(([dateKey, dayEvents]) => (
            <section key={dateKey} className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-muted">{formatDateLabel(dateKey)}</span>
              <div className="flex flex-col">
                {dayEvents.map((e) => (
                  <Link
                    key={e.id}
                    href={`/event/${e.id}`}
                    className="flex items-center justify-between border-b border-divider py-3 text-[14px]"
                  >
                    <span className="truncate pr-3">
                      {entryKind(e)}
                      {e.whatHappened?.text ? `｜${e.whatHappened.text}` : ""}
                    </span>
                    <span className="shrink-0 text-[12px] text-muted">{formatTimeOfDay(e.createdAt)}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
