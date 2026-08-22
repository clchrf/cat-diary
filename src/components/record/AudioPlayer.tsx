"use client";

import { useEffect, useRef, useState } from "react";

export function AudioPlayer({ blob, duration }: { blob: Blob; duration?: number }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const objUrl = URL.createObjectURL(blob);
    setUrl(objUrl);
    return () => URL.revokeObjectURL(objUrl);
  }, [blob]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
  }

  const mm = duration ? String(Math.floor(duration / 60)).padStart(2, "0") : "00";
  const ss = duration ? String(Math.floor(duration % 60)).padStart(2, "0") : "00";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-divider text-[13px]"
        aria-label={playing ? "暫停" : "播放"}
      >
        {playing ? "❙❙" : "▶"}
      </button>
      <span className="text-[12px] text-muted tabular-nums">🎙️ {mm}:{ss}</span>
      {url && (
        <audio
          ref={audioRef}
          src={url}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          className="hidden"
        />
      )}
    </div>
  );
}
