"use client";

import { useRef, useState } from "react";

interface VoiceRecorderProps {
  onRecorded: (blob: Blob, durationSeconds: number) => void;
  disabled?: boolean;
}

export function VoiceRecorder({ onRecorded, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const duration = (Date.now() - startRef.current) / 1000;
        onRecorded(blob, duration);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = mr;
      startRef.current = Date.now();
      mr.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 250);
    } catch {
      setError("需要麥克風權限才能錄音");
    }
  }

  function stop() {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={recording ? stop : start}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-divider text-[18px] disabled:opacity-40"
        style={{
          background: recording ? "var(--danger)" : "transparent",
          color: recording ? "#fff" : "var(--foreground)",
          borderColor: recording ? "var(--danger)" : "var(--divider)",
        }}
        aria-label={recording ? "停止錄音" : "開始錄音"}
      >
        {recording ? "■" : "🎙️"}
      </button>
      {recording && <span className="text-[13px] tabular-nums text-muted">{mm}:{ss}</span>}
      {error && <span className="text-[12px] text-[var(--danger)]">{error}</span>}
    </div>
  );
}
