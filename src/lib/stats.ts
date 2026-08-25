import { EMOTION_OPTIONS, type DiaryEvent, type EmotionKey, type EmotionIntensity } from "./types";

export interface EmotionCount {
  key: EmotionKey;
  label: string;
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
    count: counts.get(opt.key) ?? 0,
  })).filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function eventsNeedingAttention(events: DiaryEvent[]): DiaryEvent[] {
  return events.filter((e) => e.needsAttention?.flagged);
}

export interface DailyMoodBreakdown {
  primaryMood?: EmotionKey;
  secondaryMoods: EmotionKey[];
  emotionIntensity?: EmotionIntensity;
}

/**
 * Majority-vote "overall mood" across a day's events, used as both the
 * calendar dot and the day-detail breakdown. Per entry: the user's own
 * tagged emotions always win when present (a manual tag on one entry is
 * never overridden by that entry's own AI analysis); the AI's primaryMood
 * only fills in for entries the user left untagged. A day's events with
 * neither contribute nothing, which callers must render as distinct from
 * "no events at all that day".
 */
export function computeDailyMoodBreakdown(dayEvents: DiaryEvent[]): DailyMoodBreakdown {
  const moodCounts = new Map<EmotionKey, number>();
  const intensityCounts = new Map<string, number>();
  for (const e of dayEvents) {
    if (e.emotions && e.emotions.length > 0) {
      for (const emo of e.emotions) moodCounts.set(emo, (moodCounts.get(emo) ?? 0) + 1);
    } else if (e.aiMoodAnalysis?.primaryMood) {
      moodCounts.set(e.aiMoodAnalysis.primaryMood, (moodCounts.get(e.aiMoodAnalysis.primaryMood) ?? 0) + 1);
    }
    if (e.aiMoodAnalysis?.emotionIntensity) {
      intensityCounts.set(
        e.aiMoodAnalysis.emotionIntensity,
        (intensityCounts.get(e.aiMoodAnalysis.emotionIntensity) ?? 0) + 1
      );
    }
  }

  const sortedMoods = Array.from(moodCounts.entries()).sort((a, b) => b[1] - a[1]);
  const sortedIntensities = Array.from(intensityCounts.entries()).sort((a, b) => b[1] - a[1]);

  return {
    primaryMood: sortedMoods[0]?.[0],
    secondaryMoods: sortedMoods.slice(1, 3).map(([key]) => key),
    emotionIntensity: sortedIntensities[0]?.[0] as EmotionIntensity | undefined,
  };
}

export function computeAutoDailyMood(dayEvents: DiaryEvent[]): EmotionKey | undefined {
  return computeDailyMoodBreakdown(dayEvents).primaryMood;
}
