import type { EmotionKey } from "./types";

// Soft, desaturated tones — the calendar dot is an information marker,
// not a decoration, so nothing here is high-saturation.
export const MOOD_COLORS: Record<EmotionKey, string> = {
  happy: "#D9B36C", // muted warm yellow
  calm: "#9FB0C2", // muted grey-blue
  sad: "#7C93A8", // muted blue-grey (deeper than calm)
  angry: "#BE8778", // muted brick red
  anxious: "#A594AC", // muted purple-grey
  tired: "#AFA08E", // muted taupe
  confused: "#93AEAA", // muted teal-grey
};

export function moodColorFor(key?: EmotionKey): string | undefined {
  return key ? MOOD_COLORS[key] : undefined;
}
