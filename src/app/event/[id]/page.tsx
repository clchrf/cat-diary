"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { FieldDisplay } from "@/components/record/FieldDisplay";
import { getEvent, saveEvent } from "@/lib/db";
import { formatDateLabel, formatTimeOfDay } from "@/lib/date";
import { EMOTION_OPTIONS } from "@/lib/types";
import type { AiAnalysis, DiaryEvent } from "@/lib/types";

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [event, setEvent] = useState<DiaryEvent | null | undefined>(undefined);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [showDisclosure, setShowDisclosure] = useState(false);

  const [currentEmotion, setCurrentEmotion] = useState("");
  const [currentView, setCurrentView] = useState("");
  const [finalOutcome, setFinalOutcome] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");

  useEffect(() => {
    getEvent(id).then((e) => {
      setEvent(e ?? null);
      if (e?.laterReflection) {
        setCurrentEmotion(e.laterReflection.currentEmotion ?? "");
        setCurrentView(e.laterReflection.currentView ?? "");
        setFinalOutcome(e.laterReflection.finalOutcome ?? "");
      }
      if (e?.expectationVsActual) {
        setExpected(e.expectationVsActual.expected ?? "");
        setActual(e.expectationVsActual.actual ?? "");
      }
    });
  }, [id]);

  async function runAnalysis() {
    if (!event) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/analyze/event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          whatHappened: event.whatHappened?.text,
          firstReaction: event.firstReaction?.text,
          emotions: event.emotions,
          emotionsCustom: event.emotionsCustom,
          wantToDo: event.wantToDo?.text,
          displayedMindset: event.displayedMindset?.text,
          howHandled: event.howHandled?.text,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalyzeError(data.message ?? "分析失敗");
        return;
      }
      const analysis: AiAnalysis = {
        summary: data.summary,
        primaryEmotion: data.primaryEmotion,
        secondaryEmotions: data.secondaryEmotions,
        eventType: data.eventType,
        generatedAt: new Date().toISOString(),
        confirmed: false,
      };
      const updated: DiaryEvent = {
        ...event,
        aiAnalysis: analysis,
        needsAttention: data.needsAttention,
      };
      await saveEvent(updated);
      setEvent(updated);
    } catch {
      setAnalyzeError("網路錯誤，請稍後再試");
    } finally {
      setAnalyzing(false);
    }
  }

  async function confirmAiEmotions(matches: boolean) {
    if (!event?.aiAnalysis) return;
    const updated: DiaryEvent = {
      ...event,
      aiAnalysis: { ...event.aiAnalysis, confirmed: matches },
    };
    await saveEvent(updated);
    setEvent(updated);
  }

  async function saveReflection() {
    if (!event) return;
    const updated: DiaryEvent = {
      ...event,
      laterReflection: {
        currentEmotion: currentEmotion || undefined,
        currentView: currentView || undefined,
        finalOutcome: finalOutcome || undefined,
        updatedAt: new Date().toISOString(),
      },
      expectationVsActual: {
        expected: expected || undefined,
        actual: actual || undefined,
      },
    };
    await saveEvent(updated);
    setEvent(updated);
  }

  if (event === undefined) return null;
  if (event === null) {
    return (
      <main className="px-6 pt-10 text-center text-[14px] text-muted">找不到這筆紀錄</main>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-5 pb-16 pt-2">
      <div className="flex items-center justify-between py-2">
        <button onClick={() => router.back()} className="-m-2 p-2 text-[16px] text-muted">
          返回
        </button>
        <h1 className="text-[15px] font-medium">
          {formatDateLabel(event.dateKey)} {formatTimeOfDay(event.createdAt)}
        </h1>
        <div className="w-8" />
      </div>

      {event.needsAttention?.flagged && (
        <div className="rounded-xl border border-divider bg-[#faf6f2] p-3 text-[13px] leading-relaxed">
          ⚠️ 需要留意：{event.needsAttention.summary ?? "這段紀錄包含可能需要進一步關注的內容。"}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(event.emotions ?? []).map((key) => {
          const opt = EMOTION_OPTIONS.find((o) => o.key === key);
          return (
            <span key={key} className="rounded-full border border-divider px-3 py-1 text-[13px]">
              {opt?.emoji} {opt?.label}
            </span>
          );
        })}
        {event.emotionsCustom && (
          <span className="rounded-full border border-divider px-3 py-1 text-[13px]">
            {event.emotionsCustom}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <FieldDisplay label="發生了什麼事" field={event.whatHappened} />
        <FieldDisplay label="我的第一反應" field={event.firstReaction} />
        <FieldDisplay label="我想做什麼" field={event.wantToDo} />
        <FieldDisplay label="我表現出來的心態" field={event.displayedMindset} />
        <FieldDisplay label="最後我是怎麼處理的" field={event.howHandled} />
      </div>

      {/* AI analysis */}
      <section className="flex flex-col gap-3 border-t border-divider pt-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium">AI 整理</span>
          {!event.aiAnalysis && !showDisclosure && (
            <button
              onClick={() => setShowDisclosure(true)}
              className="text-[13px] text-muted underline underline-offset-2"
            >
              產生 AI 整理
            </button>
          )}
        </div>

        {showDisclosure && !event.aiAnalysis && (
          <div className="flex flex-col gap-2 rounded-xl border border-divider p-3">
            <p className="text-[12px] leading-relaxed text-muted">
              這段內容將送至 AI 服務進行分析，僅做整理與觀察，不會提供醫療或心理診斷。
            </p>
            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className="self-start rounded-lg bg-foreground px-4 py-2 text-[13px] text-background disabled:opacity-50"
            >
              {analyzing ? "分析中…" : "同意並開始分析"}
            </button>
          </div>
        )}

        {analyzeError && <p className="text-[12px] text-[var(--danger)]">{analyzeError}</p>}

        {event.aiAnalysis && (
          <div className="flex flex-col gap-3 rounded-xl border border-divider p-3">
            <p className="text-[14px] leading-relaxed">{event.aiAnalysis.summary}</p>
            <div className="text-[13px]">
              <span className="text-muted">主要情緒：</span>
              {event.aiAnalysis.primaryEmotion}
            </div>
            {!!event.aiAnalysis.secondaryEmotions?.length && (
              <div className="text-[13px]">
                <span className="text-muted">可能的次要情緒：</span>
                {event.aiAnalysis.secondaryEmotions.join("、")}
              </div>
            )}
            <div className="text-[13px]">
              <span className="text-muted">事件類型：</span>
              {event.aiAnalysis.eventType}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <span className="text-[12px] text-muted">這個整理符合你的感覺嗎？</span>
              <button
                onClick={() => confirmAiEmotions(true)}
                className="rounded-full border px-3 py-1 text-[12px]"
                style={{
                  borderColor: event.aiAnalysis.confirmed ? "var(--foreground)" : "var(--divider)",
                  background: event.aiAnalysis.confirmed ? "var(--foreground)" : "transparent",
                  color: event.aiAnalysis.confirmed ? "var(--background)" : "var(--foreground)",
                }}
              >
                符合
              </button>
              <button
                onClick={() => confirmAiEmotions(false)}
                className="rounded-full border px-3 py-1 text-[12px]"
                style={{
                  borderColor: event.aiAnalysis.confirmed === false ? "var(--foreground)" : "var(--divider)",
                  background: event.aiAnalysis.confirmed === false ? "var(--foreground)" : "transparent",
                  color: event.aiAnalysis.confirmed === false ? "var(--background)" : "var(--foreground)",
                }}
              >
                不符合
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Later reflection: 當下 vs 事後 */}
      <section className="flex flex-col gap-3 border-t border-divider pt-5">
        <span className="text-[13px] font-medium">現在回頭看</span>
        <textarea
          value={currentEmotion}
          onChange={(e) => setCurrentEmotion(e.target.value)}
          placeholder="現在的情緒（尚未記錄）"
          rows={2}
          className="w-full resize-none rounded-xl border border-divider bg-transparent p-3 text-[14px] placeholder:text-muted focus:outline-none"
        />
        <textarea
          value={currentView}
          onChange={(e) => setCurrentView(e.target.value)}
          placeholder="現在的看法（尚未記錄）"
          rows={2}
          className="w-full resize-none rounded-xl border border-divider bg-transparent p-3 text-[14px] placeholder:text-muted focus:outline-none"
        />
        <textarea
          value={finalOutcome}
          onChange={(e) => setFinalOutcome(e.target.value)}
          placeholder="最後結果（尚未記錄）"
          rows={2}
          className="w-full resize-none rounded-xl border border-divider bg-transparent p-3 text-[14px] placeholder:text-muted focus:outline-none"
        />
      </section>

      {/* Expectation vs actual */}
      <section className="flex flex-col gap-3 border-t border-divider pt-5">
        <span className="text-[13px] font-medium">預期 vs 實際</span>
        <textarea
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          placeholder="我以為會發生什麼？（尚未記錄）"
          rows={2}
          className="w-full resize-none rounded-xl border border-divider bg-transparent p-3 text-[14px] placeholder:text-muted focus:outline-none"
        />
        <textarea
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          placeholder="最後實際發生什麼？（尚未記錄）"
          rows={2}
          className="w-full resize-none rounded-xl border border-divider bg-transparent p-3 text-[14px] placeholder:text-muted focus:outline-none"
        />
        <button
          onClick={saveReflection}
          className="self-start rounded-lg border border-divider px-4 py-2 text-[13px]"
        >
          儲存
        </button>
      </section>
    </main>
  );
}
