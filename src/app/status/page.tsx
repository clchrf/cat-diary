"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getEventsInDateKeys } from "@/lib/db";
import { dateKeysInRange, formatDateLabel, formatTimeOfDay, todayKey } from "@/lib/date";
import { computeEmotionDistribution, eventsNeedingAttention } from "@/lib/stats";
import type { DiaryEvent } from "@/lib/types";

type RangeKey = "today" | "7d" | "30d";

const RANGE_DAYS: Record<RangeKey, number> = { today: 1, "7d": 7, "30d": 30 };

interface TrendResult {
  summary: string;
  commonTriggers: string[];
  observation: string;
}

export default function StatusPage() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [events, setEvents] = useState<DiaryEvent[]>([]);
  const [trend, setTrend] = useState<TrendResult | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [showDisclosure, setShowDisclosure] = useState(false);

  useEffect(() => {
    const keys = range === "today" ? [todayKey()] : dateKeysInRange(RANGE_DAYS[range]);
    getEventsInDateKeys(keys).then(setEvents);
    setTrend(null);
  }, [range]);

  const emotionDist = useMemo(() => computeEmotionDistribution(events), [events]);
  const maxCount = emotionDist[0]?.count ?? 1;
  const attention = useMemo(() => eventsNeedingAttention(events), [events]);

  const [recentEvents, setRecentEvents] = useState<DiaryEvent[]>([]);
  useEffect(() => {
    getEventsInDateKeys(dateKeysInRange(30)).then(setRecentEvents);
  }, []);
  const recentEmotionDist = useMemo(() => computeEmotionDistribution(recentEvents), [recentEvents]);

  async function runTrendAnalysis() {
    setTrendLoading(true);
    setTrendError(null);
    try {
      const res = await fetch("/api/analyze/trend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          events: events.map((e) => ({
            dateKey: e.dateKey,
            whatHappened: e.whatHappened?.text,
            emotions: e.emotions,
            firstReaction: e.firstReaction?.text,
            howHandled: e.howHandled?.text,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTrendError(data.message ?? "分析失敗");
        return;
      }
      setTrend(data);
    } catch {
      setTrendError("網路錯誤，請稍後再試");
    } finally {
      setTrendLoading(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-5 pb-16 pt-6">
      <h1 className="text-[17px] font-semibold">狀況</h1>

      <div className="flex gap-2">
        {(["today", "7d", "30d"] as RangeKey[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className="rounded-full border px-4 py-1.5 text-[13px]"
            style={{
              borderColor: range === r ? "var(--foreground)" : "var(--divider)",
              background: range === r ? "var(--foreground)" : "transparent",
              color: range === r ? "var(--background)" : "var(--foreground)",
            }}
          >
            {r === "today" ? "今天" : r === "7d" ? "7 天" : "30 天"}
          </button>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <div className="text-[13px] text-muted">紀錄次數</div>
        <div className="text-[28px] font-light tabular-nums">{events.length}</div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="text-[13px] text-muted">情緒分布</div>
        {emotionDist.length === 0 ? (
          <p className="text-[13px] text-muted">尚無資料</p>
        ) : (
          <div className="flex flex-col gap-2">
            {emotionDist.map((e) => (
              <div key={e.key} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-[13px]">{e.emoji} {e.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-divider">
                  <div
                    className="h-full rounded-full bg-foreground"
                    style={{ width: `${(e.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-5 text-right text-[12px] tabular-nums text-muted">{e.count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-divider pt-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted">AI 整理出的趨勢</span>
          {!trend && !showDisclosure && (
            <button
              onClick={() => setShowDisclosure(true)}
              className="text-[13px] underline underline-offset-2"
            >
              產生整理
            </button>
          )}
        </div>
        {showDisclosure && !trend && (
          <div className="flex flex-col gap-2 rounded-xl border border-divider p-3">
            <p className="text-[12px] leading-relaxed text-muted">
              這段期間的紀錄內容將送至 AI 服務進行整理，僅做觀察歸納，不會提供醫療或心理診斷。
            </p>
            <button
              onClick={runTrendAnalysis}
              disabled={trendLoading || events.length === 0}
              className="self-start rounded-lg bg-foreground px-4 py-2 text-[13px] text-background disabled:opacity-50"
            >
              {trendLoading ? "整理中…" : "同意並開始整理"}
            </button>
          </div>
        )}
        {trendError && <p className="text-[12px] text-[var(--danger)]">{trendError}</p>}
        {trend && (
          <div className="flex flex-col gap-2 rounded-xl border border-divider p-3 text-[13px] leading-relaxed">
            <p>{trend.summary}</p>
            {!!trend.commonTriggers.length && (
              <p className="text-muted">常見觸發情境：{trend.commonTriggers.join("、")}</p>
            )}
            <p className="text-muted">{trend.observation}</p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-divider pt-5">
        <span className="text-[13px] text-muted">最近的我（過去 30 天，共記錄 {recentEvents.length} 次）</span>
        {recentEmotionDist.length === 0 ? (
          <p className="text-[13px] text-muted">尚無資料</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {recentEmotionDist.slice(0, 3).map((e) => (
              <span key={e.key} className="rounded-full border border-divider px-3 py-1 text-[13px]">
                {e.emoji} {e.label}
              </span>
            ))}
          </div>
        )}
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

      <section className="flex flex-col gap-2 border-t border-divider pt-5">
        <span className="text-[13px] text-muted">這段期間的紀錄</span>
        {events.length === 0 ? (
          <p className="text-[13px] text-muted">尚無資料</p>
        ) : (
          events
            .slice()
            .reverse()
            .map((e) => (
              <Link
                key={e.id}
                href={`/event/${e.id}`}
                className="flex items-center justify-between border-b border-divider py-3 text-[14px]"
              >
                <span className="truncate pr-3">{e.whatHappened?.text || "（未輸入文字）"}</span>
                <span className="shrink-0 text-[12px] text-muted">{formatTimeOfDay(e.createdAt)}</span>
              </Link>
            ))
        )}
      </section>

      <Link href="/settings" className="mt-2 text-center text-[13px] text-muted underline underline-offset-2">
        設定與匯出報告
      </Link>
    </main>
  );
}
