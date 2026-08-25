"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getEventsInDateKeys,
  getAllMedication,
  getAllAudio,
} from "@/lib/db";
import { dateKeysBetween, dateKeysInRange, formatDateLabel, formatTimeOfDay, todayKey } from "@/lib/date";
import { computeEmotionDistribution, eventsNeedingAttention } from "@/lib/stats";
import type { AudioRecord, DiaryEvent, MedicationRecord } from "@/lib/types";

type RangeMode = "7d" | "30d" | "custom";

export default function ReportPage() {
  const router = useRouter();
  const [mode, setMode] = useState<RangeMode>("30d");
  const [customStart, setCustomStart] = useState(todayKey());
  const [customEnd, setCustomEnd] = useState(todayKey());
  const [includeVoiceIndex, setIncludeVoiceIndex] = useState(false);
  const [generated, setGenerated] = useState<{
    events: DiaryEvent[];
    medication: MedicationRecord[];
    audio: AudioRecord[];
    keys: string[];
  } | null>(null);

  const rangeKeys = useMemo(() => {
    if (mode === "7d") return dateKeysInRange(7);
    if (mode === "30d") return dateKeysInRange(30);
    return dateKeysBetween(customStart, customEnd);
  }, [mode, customStart, customEnd]);

  async function generate() {
    const keySet = new Set(rangeKeys);
    const [events, allMed, allAudio] = await Promise.all([
      getEventsInDateKeys(rangeKeys),
      getAllMedication(),
      getAllAudio(),
    ]);
    const medication = allMed.filter((m) => keySet.has(m.dateKey));
    setGenerated({ events, medication, audio: allAudio, keys: rangeKeys });
  }

  const emotionDist = generated ? computeEmotionDistribution(generated.events) : [];
  const attention = generated ? eventsNeedingAttention(generated.events) : [];

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-5 pb-16 pt-2">
      <div className="flex items-center justify-between py-2 print:hidden">
        <button onClick={() => router.back()} className="-m-2 p-2 text-[16px] text-muted">
          返回
        </button>
        <h1 className="text-[15px] font-medium">匯出紀錄</h1>
        <div className="w-8" />
      </div>

      <div className="flex flex-col gap-3 print:hidden">
        <div className="flex gap-2">
          {(["7d", "30d", "custom"] as RangeMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="rounded-full border px-4 py-1.5 text-[13px]"
              style={{
                borderColor: mode === m ? "var(--foreground)" : "var(--divider)",
                background: mode === m ? "var(--foreground)" : "transparent",
                color: mode === m ? "var(--background)" : "var(--foreground)",
              }}
            >
              {m === "7d" ? "7 天" : m === "30d" ? "30 天" : "自訂日期"}
            </button>
          ))}
        </div>
        {mode === "custom" && (
          <div className="flex items-center gap-2 text-[13px]">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-divider bg-transparent p-2"
            />
            <span className="text-muted">至</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-divider bg-transparent p-2"
            />
          </div>
        )}
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={includeVoiceIndex}
            onChange={(e) => setIncludeVoiceIndex(e.target.checked)}
          />
          包含語音索引（時間與長度，不含原始錄音檔）
        </label>
        <button
          onClick={generate}
          className="rounded-2xl bg-foreground py-3 text-[15px] font-medium text-background"
        >
          產生報告
        </button>
      </div>

      {generated && (
        <div className="flex flex-col gap-5 border-t border-divider pt-5">
          <div className="flex items-center justify-between print:hidden">
            <span className="text-[13px] text-muted">
              {generated.keys[generated.keys.length - 1]} ~ {generated.keys[0]}
            </span>
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-divider px-3 py-1.5 text-[13px]"
            >
              列印 / 另存為 PDF
            </button>
          </div>

          <h2 className="text-[16px] font-semibold">個人情緒與生活紀錄</h2>
          <p className="text-[12px] text-muted">
            期間：{generated.keys[generated.keys.length - 1]} ~ {generated.keys[0]}
            每日紀錄數平均：{(generated.events.length / Math.max(generated.keys.length, 1)).toFixed(1)} 筆／天
            總計 {generated.events.length} 筆
          </p>

          <section>
            <h3 className="mb-2 text-[13px] font-medium">情緒分布</h3>
            {emotionDist.length === 0 ? (
              <p className="text-[13px] text-muted">尚無資料</p>
            ) : (
              <ul className="text-[13px] leading-relaxed">
                {emotionDist.map((e) => (
                  <li key={e.key}>
                    {e.label}：{e.count} 次
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-[13px] font-medium">吃藥紀錄</h3>
            <p className="text-[13px] text-muted">
              期間內共記錄 {generated.medication.length} 次（不含劑量或藥物內容，僅為使用者自行標記「已吃藥」的次數）
            </p>
          </section>

          {attention.length > 0 && (
            <section>
              <h3 className="mb-2 text-[13px] font-medium">⚠️ 需要留意的紀錄</h3>
              <ul className="flex flex-col gap-2 text-[13px] leading-relaxed">
                {attention.map((e) => (
                  <li key={e.id}>
                    {formatDateLabel(e.dateKey)} {formatTimeOfDay(e.createdAt)}：
                    {e.needsAttention?.summary ?? "這段紀錄包含可能需要進一步關注的內容。"}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-[13px] font-medium">主要事件與文字轉錄</h3>
            <ul className="flex flex-col gap-3 text-[13px] leading-relaxed">
              {generated.events.map((e) => (
                <li key={e.id} className="border-b border-divider pb-2">
                  <div className="text-muted">
                    {formatDateLabel(e.dateKey)} {formatTimeOfDay(e.createdAt)}
                    {e.emotions?.length ? `　情緒：${e.emotions.join("、")}` : ""}
                  </div>
                  {e.whatHappened?.text && <div>發生了什麼事：{e.whatHappened.text}</div>}
                  {e.howHandled?.text && <div>最後怎麼處理：{e.howHandled.text}</div>}
                  {includeVoiceIndex &&
                    generated.audio
                      .filter((a) =>
                        [e.whatHappened, e.firstReaction, e.wantToDo, e.displayedMindset, e.howHandled]
                          .map((f) => f?.audioId)
                          .includes(a.id)
                      )
                      .map((a) => (
                        <div key={a.id} className="text-muted">
                          🎙️ {formatTimeOfDay(a.timestamp)}（{Math.round(a.duration)} 秒）
                        </div>
                      ))}
                </li>
              ))}
            </ul>
          </section>

          <p className="text-[11px] text-muted">
            本報告由使用者自行記錄與 AI 輔助整理產生，僅供參考，不構成醫療診斷。
          </p>
        </div>
      )}
    </main>
  );
}
