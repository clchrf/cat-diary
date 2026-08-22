import { EMOTION_OPTIONS } from "./types";
import type { DiaryEvent } from "./types";
import { formatDateLabel, formatTimeOfDay } from "./date";

const PREAMBLE = `以下是我的生活紀錄。

請先幫我理解我當時的想法與情緒，不要急著給建議。

請整理：

1. 發生了什麼事
2. 我的第一反應
3. 我真正的情緒
4. 我在意的事情
5. 我當時可能在想什麼
6. 我的行為與想法是否有落差
7. 現在回頭看，我的想法有沒有改變
8. 哪些地方我自己可能還沒有想清楚

如果資訊不足，請直接指出，不要自行猜測。`;

const CLOSING = "請先幫我理解，再視情況提供建議。";

function emotionLabels(keys: string[] | undefined, custom: string | undefined): string {
  const labels = (keys ?? []).map((k) => EMOTION_OPTIONS.find((o) => o.key === k)?.label ?? k);
  if (custom) labels.push(custom);
  return labels.join("、");
}

function eventLines(e: DiaryEvent): string[] {
  const lines: string[] = [];
  const time = `${formatDateLabel(e.dateKey)} ${formatTimeOfDay(e.createdAt)}`;
  lines.push(`【${time}】`);
  if (e.whatHappened?.text) lines.push(`發生了什麼事：${e.whatHappened.text}`);
  if (e.firstReaction?.text) lines.push(`我的第一反應：${e.firstReaction.text}`);
  const emotions = emotionLabels(e.emotions, e.emotionsCustom);
  if (emotions) lines.push(`實際情緒：${emotions}`);
  if (e.wantToDo?.text) lines.push(`我想做什麼：${e.wantToDo.text}`);
  if (e.displayedMindset?.text) lines.push(`我表現出來的心態：${e.displayedMindset.text}`);
  if (e.howHandled?.text) lines.push(`最後我是怎麼處理的：${e.howHandled.text}`);
  if (e.laterReflection?.currentEmotion) lines.push(`現在回頭看－現在的情緒：${e.laterReflection.currentEmotion}`);
  if (e.laterReflection?.currentView) lines.push(`現在回頭看－現在的看法：${e.laterReflection.currentView}`);
  if (e.laterReflection?.finalOutcome) lines.push(`現在回頭看－最後結果：${e.laterReflection.finalOutcome}`);
  if (e.expectationVsActual?.expected) lines.push(`我以為會發生什麼：${e.expectationVsActual.expected}`);
  if (e.expectationVsActual?.actual) lines.push(`最後實際發生什麼：${e.expectationVsActual.actual}`);
  return lines;
}

/** A single event's fields, assembled into a prompt the user can paste into any AI they use. */
export function buildEventPrompt(event: DiaryEvent): string {
  const lines = eventLines(event);
  const body = lines.length > 1 ? lines.join("\n") : "（這筆紀錄目前沒有太多文字內容）";
  return `${PREAMBLE}\n\n以下是我的原始紀錄：\n\n「\n${body}\n」\n\n${CLOSING}`;
}

/** Multiple events over a date range, assembled the same way. */
export function buildRangePrompt(events: DiaryEvent[], rangeLabel: string): string {
  if (events.length === 0) {
    return `${PREAMBLE}\n\n以下是我的原始紀錄：\n\n「\n${rangeLabel}目前沒有任何紀錄。\n」\n\n${CLOSING}`;
  }
  const body = events.map((e) => eventLines(e).join("\n")).join("\n\n");
  return `${PREAMBLE}\n\n以下是我在${rangeLabel}的原始紀錄（共 ${events.length} 筆）：\n\n「\n${body}\n」\n\n${CLOSING}`;
}
