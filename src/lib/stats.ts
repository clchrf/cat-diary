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

/**
 * Majority-vote "overall mood" for a single day's events, used as the
 * default calendar indicator before/unless the user sets one manually.
 * Returns undefined when nothing in that day's events has a tagged emotion,
 * which callers must render as distinct from "no events at all that day".
 */
export function computeAutoDailyMood(dayEvents: DiaryEvent[]): EmotionKey | undefined {
  const counts = new Map<EmotionKey, number>();
  for (const e of dayEvents) {
    for (const emo of e.emotions ?? []) {
      counts.set(emo, (counts.get(emo) ?? 0) + 1);
    }
  }
  let best: EmotionKey | undefined;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}
