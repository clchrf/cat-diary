"use client";

import { useState } from "react";
import { VoiceRecorder } from "./VoiceRecorder";
import { AudioPlayer } from "./AudioPlayer";
import { saveAudio } from "@/lib/db";
import type { AudioRecord } from "@/lib/types";

interface PrimaryVoiceEntryProps {
  audio?: { id: string; blob: Blob; duration: number };
  onAudioRecorded: (audio: { id: string; blob: Blob; duration: number }) => void;
  text: string;
  onTextChange: (text: string) => void;
}

export function PrimaryVoiceEntry({ audio, onAudioRecorded, text, onTextChange }: PrimaryVoiceEntryProps) {
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  async function handleRecorded(blob: Blob, duration: number) {
    const id = crypto.randomUUID();
    const record: AudioRecord = {
      id,
      timestamp: new Date().toISOString(),
      duration,
      audioBlob: blob,
      linkedField: "whatHappened",
    };
    await saveAudio(record);
    onAudioRecorded({ id, blob, duration });
  }

  async function handleTranscribe() {
    if (!audio) return;
    setTranscribing(true);
    setTranscribeError(null);
    try {
      const form = new FormData();
      form.append("audio", audio.blob, "audio.webm");
      const res = await fetch("/api/stt", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setTranscribeError(data.message ?? "轉文字失敗");
        return;
      }
      if (data.transcript) {
        onTextChange(data.transcript);
        const record = { id: audio.id, timestamp: new Date().toISOString(), duration: audio.duration, audioBlob: audio.blob, transcript: data.transcript, linkedField: "whatHappened" } as AudioRecord;
        await saveAudio(record);
      }
    } catch {
      setTranscribeError("網路錯誤，請稍後再試");
    } finally {
      setTranscribing(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-divider p-5">
      {!audio ? (
        <>
          <VoiceRecorder onRecorded={handleRecorded} />
          <p className="text-[12px] text-muted">按下開始錄音，再按一次停止</p>
        </>
      ) : (
        <>
          <AudioPlayer blob={audio.blob} duration={audio.duration} />
          <div className="flex items-center gap-3">
            <VoiceRecorder onRecorded={handleRecorded} />
            <button
              onClick={handleTranscribe}
              disabled={transcribing}
              className="rounded-full border border-divider px-4 py-2 text-[13px] disabled:opacity-50"
            >
              {transcribing ? "轉換中…" : "轉換成文字"}
            </button>
          </div>
          {transcribeError && <span className="text-[12px] text-[var(--danger)]">{transcribeError}</span>}
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="轉成的文字會出現在這裡，也可以直接修改或補充"
            rows={3}
            className="w-full resize-none rounded-xl border border-divider bg-transparent p-3 text-[15px] leading-snug placeholder:text-muted focus:outline-none"
          />
        </>
      )}
    </div>
  );
}
