import type { NeedsAttention } from "./types";

// A quiet, local keyword safety net — not AI, not a diagnosis. It only ever
// flags with confidence "uncertain" (a keyword match proves nothing about
// intent or severity on its own) and never claims "certain". Runs silently
// at save time; nothing is sent anywhere.
const RISK_PHRASES = [
  "不想活",
  "想死",
  "去死",
  "自殺",
  "自殘",
  "傷害自己",
  "割腕",
  "活不下去",
  "結束生命",
  "不想存在",
  "消失就好",
  "了結自己",
  "不如死了算了",
  "不想醒來",
];

export function scanNeedsAttention(texts: Array<string | undefined>): NeedsAttention {
  const combined = texts.filter(Boolean).join(" ");
  const flagged = RISK_PHRASES.some((phrase) => combined.includes(phrase));
  if (flagged) {
    return {
      flagged: true,
      confidence: "uncertain",
      summary: "這段紀錄包含可能需要進一步關注的內容。",
    };
  }
  return { flagged: false, confidence: "none" };
}
