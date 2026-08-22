import { EMOTION_OPTIONS, type DiaryEvent, type EmotionKey } from "./types";

export interface EmotionCount {
  key: EmotionKey;
  label: string;
  emoji: string;
  count: number;
}

export function computeEmotionDistribution(events: DiaryEvent[]): EmotionCount[] {
  const counts = new Map<EmotionKey, number>();
  for (const e of events) {
    for (const emo of e.emotions ?? []) {
      counts.set(emo, (counts.get(emo) ?? 0) + 1);
    }
  }
  return EMOTION_OPTIONS.map((opt) => ({
    key: opt.key,
    label: opt.label,
    emoji: opt.emoji,
    count: counts.get(opt.key) ?? 0,
  })).filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function eventsNeedingAttention(events: DiaryEvent[]): DiaryEvent[] {
  return events.filter((e) => e.needsAttention?.flagged);
}
