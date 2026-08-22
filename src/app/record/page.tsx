"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EntryModeSelect } from "@/components/record/EntryModeSelect";
import { PrimaryVoiceEntry } from "@/components/record/PrimaryVoiceEntry";
import { TextField } from "@/components/record/TextField";
import { MoodPicker } from "@/components/record/MoodPicker";
import { saveEvent, addCans } from "@/lib/db";
import { todayKey, nowIso } from "@/lib/date";
import { scanNeedsAttention } from "@/lib/safetyCheck";
import type { DiaryEvent, EmotionKey, TextOrVoiceField } from "@/lib/types";

type EntryMode = "record" | "text" | null;

interface FieldState {
  text: string;
  audio?: { id: string; blob: Blob; duration: number };
}

const emptyField = (): FieldState => ({ text: "" });

function toTextOrVoiceField(f: FieldState): TextOrVoiceField | undefined {
  if (!f.text.trim() && !f.audio) return undefined;
  return { text: f.text.trim(), audioId: f.audio?.id };
}

export default function RecordPage() {
  const router = useRouter();
  const [mode, setMode] = useState<EntryMode>(null);
  const [whatHappened, setWhatHappened] = useState(emptyField());
  const [firstReaction, setFirstReaction] = useState("");
  const [wantToDo, setWantToDo] = useState("");
  const [displayedMindset, setDisplayedMindset] = useState("");
  const [howHandled, setHowHandled] = useState("");
  const [emotions, setEmotions] = useState<EmotionKey[]>([]);
  const [emotionsCustom, setEmotionsCustom] = useState("");
  const [saving, setSaving] = useState(false);

  const hasAnyContent =
    whatHappened.text.trim() ||
    whatHappened.audio ||
    firstReaction.trim() ||
    wantToDo.trim() ||
    displayedMindset.trim() ||
    howHandled.trim() ||
    emotions.length > 0 ||
    emotionsCustom.trim();

  async function handleSave() {
    if (!hasAnyContent || saving) return;
    setSaving(true);
    const event: DiaryEvent = {
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      dateKey: todayKey(),
      whatHappened: toTextOrVoiceField(whatHappened),
      firstReaction: firstReaction.trim() ? { text: firstReaction.trim() } : undefined,
      emotions: emotions.length ? emotions : undefined,
      emotionsCustom: emotionsCustom.trim() || undefined,
      wantToDo: wantToDo.trim() ? { text: wantToDo.trim() } : undefined,
      displayedMindset: displayedMindset.trim() ? { text: displayedMindset.trim() } : undefined,
      howHandled: howHandled.trim() ? { text: howHandled.trim() } : undefined,
    };
    event.needsAttention = scanNeedsAttention([
      event.whatHappened?.text,
      event.firstReaction?.text,
      event.wantToDo?.text,
      event.displayedMindset?.text,
      event.howHandled?.text,
    ]);
    await saveEvent(event);
    await addCans(1, "record");
    router.push("/");
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-5 pb-10 pt-2">
      <div className="flex items-center justify-between py-2">
        <button onClick={() => router.back()} className="-m-2 p-2 text-[16px] text-muted">
          取消
        </button>
        <h1 className="text-[15px] font-medium">記錄今天</h1>
        <button
          onClick={handleSave}
          disabled={!hasAnyContent || saving || mode === null}
          className="-m-2 p-2 text-[16px] font-semibold disabled:opacity-30"
        >
          儲存
        </button>
      </div>

      {mode === null ? (
        <EntryModeSelect onSelect={setMode} />
      ) : (
        <>
          <p className="text-[12px] leading-relaxed text-muted">
            以下欄位都不是必填，只記一句話也可以直接儲存。
            {mode === "record" && "錄音會送至 AI 服務轉換成文字，需要你按下「轉換成文字」才會送出。"}
          </p>

          {mode === "record" ? (
            <PrimaryVoiceEntry
              audio={whatHappened.audio}
              onAudioRecorded={(a) => setWhatHappened((s) => ({ ...s, audio: a }))}
              text={whatHappened.text}
              onTextChange={(t) => setWhatHappened((s) => ({ ...s, text: t }))}
            />
          ) : (
            <TextField label="發生了什麼事？" value={whatHappened.text} onChange={(t) => setWhatHappened((s) => ({ ...s, text: t }))} />
          )}

          <button
            onClick={() => setMode(mode === "record" ? "text" : "record")}
            className="self-start text-[12px] text-muted underline underline-offset-2"
          >
            {mode === "record" ? "改用純文字" : "🎙️ 改用錄音"}
          </button>

          <TextField label="我的第一反應是什麼？" value={firstReaction} onChange={setFirstReaction} />

          <MoodPicker
            selected={emotions}
            onChange={setEmotions}
            customText={emotionsCustom}
            onCustomTextChange={setEmotionsCustom}
          />

          <TextField label="我想做什麼？" value={wantToDo} onChange={setWantToDo} />
          <TextField label="我表現出來的心態是什麼？" value={displayedMindset} onChange={setDisplayedMindset} />
          <TextField label="最後我是怎麼處理的？" value={howHandled} onChange={setHowHandled} />
        </>
      )}
    </main>
  );
}
