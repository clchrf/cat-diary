"use client";

import { useState } from "react";
import { VoiceRecorder } from "./VoiceRecorder";
import { AudioPlayer } from "./AudioPlayer";
import { saveAudio } from "@/lib/db";
import type { AudioRecord } from "@/lib/types";

interface FieldInputProps {
  label: string;
  placeholder?: string;
  text: string;
  onTextChange: (text: string) => void;
  audio?: { blob: Blob; duration: number };
  onAudioRecorded: (audio: { id: string; blob: Blob; duration: number }) => void;
  fieldKey: string;
}

export function FieldInput({
  label,
  placeholder,
  text,
  onTextChange,
  audio,
  onAudioRecorded,
  fieldKey,
}: FieldInputProps) {
  const [transcribing, setTranscribing] = useState(false);

  async function handleRecorded(blob: Blob, duration: number) {
    const id = crypto.randomUUID();
    const record: AudioRecord = {
      id,
      timestamp: new Date().toISOString(),
      duration,
      audioBlob: blob,
      linkedField: fieldKey,
    };
    await saveAudio(record);
    onAudioRecorded({ id, blob, duration });

    setTranscribing(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "audio.webm");
      const res = await fetch("/api/stt", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        if (data.transcript) {
          onTextChange(data.transcript);
          record.transcript = data.transcript;
          await saveAudio(record);
        }
      }
    } catch {
      // STT unavailable — audio is still saved, user can type manually
    } finally {
      setTranscribing(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        <VoiceRecorder onRecorded={handleRecorded} />
      </div>
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={placeholder ?? "尚未記錄"}
        rows={2}
        className="w-full resize-none rounded-xl border border-divider bg-transparent p-3 text-[15px] leading-snug placeholder:text-muted focus:outline-none"
      />
      {transcribing && <span className="text-[12px] text-muted">轉文字中…</span>}
      {audio && <AudioPlayer blob={audio.blob} duration={audio.duration} />}
    </div>
  );
}
