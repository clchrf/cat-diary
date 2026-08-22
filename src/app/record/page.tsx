"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FieldInput } from "@/components/record/FieldInput";
import { MoodPicker } from "@/components/record/MoodPicker";
import { saveEvent, addCans } from "@/lib/db";
import { todayKey, nowIso } from "@/lib/date";
import type { DiaryEvent, EmotionKey, TextOrVoiceField } from "@/lib/types";

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
  const [whatHappened, setWhatHappened] = useState(emptyField());
  const [firstReaction, setFirstReaction] = useState(emptyField());
  const [wantToDo, setWantToDo] = useState(emptyField());
  const [displayedMindset, setDisplayedMindset] = useState(emptyField());
  const [howHandled, setHowHandled] = useState(emptyField());
  const [emotions, setEmotions] = useState<EmotionKey[]>([]);
  const [emotionsCustom, setEmotionsCustom] = useState("");
  const [saving, setSaving] = useState(false);

  const hasAnyContent =
    whatHappened.text.trim() ||
    whatHappened.audio ||
    firstReaction.text.trim() ||
    firstReaction.audio ||
    wantToDo.text.trim() ||
    wantToDo.audio ||
    displayedMindset.text.trim() ||
    displayedMindset.audio ||
    howHandled.text.trim() ||
    howHandled.audio ||
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
      firstReaction: toTextOrVoiceField(firstReaction),
      emotions: emotions.length ? emotions : undefined,
      emotionsCustom: emotionsCustom.trim() || undefined,
      wantToDo: toTextOrVoiceField(wantToDo),
      displayedMindset: toTextOrVoiceField(displayedMindset),
      howHandled: toTextOrVoiceField(howHandled),
    };
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
          disabled={!hasAnyContent || saving}
          className="-m-2 p-2 text-[16px] font-semibold disabled:opacity-30"
        >
          儲存
        </button>
      </div>

      <p className="text-[12px] leading-relaxed text-muted">
        以下欄位都不是必填，只記一句話也可以直接儲存。使用錄音時，該段音檔會送至 AI 服務轉換成文字。
      </p>

      <FieldInput
        fieldKey="whatHappened"
        label="發生了什麼事？"
        text={whatHappened.text}
        onTextChange={(t) => setWhatHappened((s) => ({ ...s, text: t }))}
        audio={whatHappened.audio}
        onAudioRecorded={(a) => setWhatHappened((s) => ({ ...s, audio: a }))}
      />

      <FieldInput
        fieldKey="firstReaction"
        label="我的第一反應是什麼？"
        text={firstReaction.text}
        onTextChange={(t) => setFirstReaction((s) => ({ ...s, text: t }))}
        audio={firstReaction.audio}
        onAudioRecorded={(a) => setFirstReaction((s) => ({ ...s, audio: a }))}
      />

      <MoodPicker
        selected={emotions}
        onChange={setEmotions}
        customText={emotionsCustom}
        onCustomTextChange={setEmotionsCustom}
      />

      <FieldInput
        fieldKey="wantToDo"
        label="我想做什麼？"
        text={wantToDo.text}
        onTextChange={(t) => setWantToDo((s) => ({ ...s, text: t }))}
        audio={wantToDo.audio}
        onAudioRecorded={(a) => setWantToDo((s) => ({ ...s, audio: a }))}
      />

      <FieldInput
        fieldKey="displayedMindset"
        label="我表現出來的心態是什麼？"
        text={displayedMindset.text}
        onTextChange={(t) => setDisplayedMindset((s) => ({ ...s, text: t }))}
        audio={displayedMindset.audio}
        onAudioRecorded={(a) => setDisplayedMindset((s) => ({ ...s, audio: a }))}
      />

      <FieldInput
        fieldKey="howHandled"
        label="最後我是怎麼處理的？"
        text={howHandled.text}
        onTextChange={(t) => setHowHandled((s) => ({ ...s, text: t }))}
        audio={howHandled.audio}
        onAudioRecorded={(a) => setHowHandled((s) => ({ ...s, audio: a }))}
      />
    </main>
  );
}
