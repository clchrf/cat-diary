import { getEvent, saveEvent } from "./db";
import { formatTimeOfDay } from "./date";
import { EMOTION_OPTIONS, type DiaryEvent, type EmotionKey, type EmotionIntensity, type EventMoodAnalysis } from "./types";

const LABEL_TO_KEY: Record<string, EmotionKey> = Object.fromEntries(
  EMOTION_OPTIONS.map((o) => [o.label, o.key])
);
const INTENSITIES: EmotionIntensity[] = ["低", "中等", "高"];

function toEmotionKey(label: unknown): EmotionKey | undefined {
  return typeof label === "string" ? LABEL_TO_KEY[label] : undefined;
}

/** Only the entry's own diary fields — never other days, audio, or medication. */
export function buildAnalyzableText(event: DiaryEvent): string {
  return [
    event.whatHappened?.text,
    event.firstReaction?.text,
    event.wantToDo?.text,
    event.displayedMindset?.text,
    event.howHandled?.text,
  ]
    .filter((t): t is string => !!t && t.trim().length > 0)
    .join("\n");
}

/**
 * Fire-and-forget: reads the just-saved event fresh, sends only its own
 * text to /api/analyze, and writes the result back. Never awaited by the
 * save flow — a slow or failed AI call can never block or fail a diary
 * save, it just leaves aiMoodAnalysis showing "not analyzed yet".
 */
interface AnalyzeResult {
  outcome: EventMoodAnalysis;
  safetyFlag: boolean;
}

async function requestEventAnalysis(text: string): Promise<AnalyzeResult> {
  const analyzedAt = new Date().toISOString();
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "event", text }),
    });
    if (!res.ok) {
      return { outcome: { status: res.status === 501 ? "unavailable" : "error", analyzedAt }, safetyFlag: false };
    }
    const data = await res.json();
    const secondaryMoods: EmotionKey[] = Array.isArray(data?.secondaryMoods)
      ? data.secondaryMoods.map(toEmotionKey).filter((k: EmotionKey | undefined): k is EmotionKey => !!k)
      : [];
    const importantEvents: string[] = Array.isArray(data?.importantEvents)
      ? data.importantEvents.filter((s: unknown): s is string => typeof s === "string").slice(0, 3)
      : [];
    return {
      outcome: {
        status: "ok",
        primaryMood: toEmotionKey(data?.primaryMood),
        secondaryMoods,
        emotionIntensity: INTENSITIES.includes(data?.emotionIntensity) ? data.emotionIntensity : undefined,
        importantEvents,
        summary: typeof data?.summary === "string" ? data.summary : undefined,
        analyzedAt,
      },
      safetyFlag: data?.safetyFlag === true,
    };
  } catch {
    return { outcome: { status: "error", analyzedAt }, safetyFlag: false };
  }
}

export async function analyzeEventInBackground(eventId: string): Promise<void> {
  const event = await getEvent(eventId).catch(() => undefined);
  if (!event) return;

  const text = buildAnalyzableText(event);
  if (!text.trim()) return; // nothing written yet to reflect on — leave unset, not an error

  const { outcome, safetyFlag } = await requestEventAnalysis(text);

  // Re-read fresh in case the user edited the entry (e.g. later reflection)
  // while analysis was in flight — merge onto the current record, not the
  // stale snapshot from when analysis started.
  const fresh = await getEvent(eventId).catch(() => undefined);
  if (!fresh) return;

  const needsAttention =
    safetyFlag && !fresh.needsAttention?.flagged
      ? {
          flagged: true,
          confidence: "uncertain" as const,
          summary: "AI 整理時偵測到可能需要留意的語句，建議自己回頭看看這篇內容。",
        }
      : fresh.needsAttention;

  await saveEvent({ ...fresh, aiMoodAnalysis: outcome, needsAttention });
}

/**
 * A day's overall narrative — only computed on demand (day detail view),
 * from that day's already-short per-entry summaries, never raw text.
 * Single entry days skip the extra API call entirely.
 */
export async function synthesizeDailySummary(dayEvents: DiaryEvent[]): Promise<string | undefined> {
  const analyzed = dayEvents
    .filter((e) => e.aiMoodAnalysis?.status === "ok" && e.aiMoodAnalysis.summary)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (analyzed.length === 0) return undefined;
  if (analyzed.length === 1) return analyzed[0].aiMoodAnalysis!.summary;

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "daily",
        entries: analyzed.map((e) => ({ time: formatTimeOfDay(e.createdAt), summary: e.aiMoodAnalysis!.summary })),
      }),
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    return typeof data?.overallSummary === "string" ? data.overallSummary : undefined;
  } catch {
    return undefined;
  }
}
