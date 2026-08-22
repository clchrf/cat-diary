"use client";

import { useEffect, useState } from "react";
import { AudioPlayer } from "./AudioPlayer";
import { getAudio } from "@/lib/db";
import type { TextOrVoiceField } from "@/lib/types";

export function FieldDisplay({ label, field }: { label: string; field?: TextOrVoiceField }) {
  const [audio, setAudio] = useState<{ blob: Blob; duration: number } | null>(null);

  useEffect(() => {
    if (!field?.audioId) return;
    getAudio(field.audioId).then((rec) => {
      if (rec) setAudio({ blob: rec.audioBlob, duration: rec.duration });
    });
  }, [field?.audioId]);

  return (
    <div className="flex flex-col gap-1.5 border-b border-divider pb-4">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <p className="text-[15px] leading-relaxed">
        {field?.text ? field.text : <span className="text-muted">尚未記錄</span>}
      </p>
      {audio && <AudioPlayer blob={audio.blob} duration={audio.duration} />}
    </div>
  );
}
