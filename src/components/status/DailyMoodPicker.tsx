"use client";

import { EMOTION_OPTIONS, type EmotionKey } from "@/lib/types";
import { moodColorFor } from "@/lib/moodColors";
import { MoodDot } from "@/components/shared/MoodDot";

interface DailyMoodPickerProps {
  value?: EmotionKey;
  onChange: (key: EmotionKey) => void;
}

export function DailyMoodPicker({ value, onChange }: DailyMoodPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {EMOTION_OPTIONS.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className="flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-[14px]"
            style={{
              minHeight: 44,
              borderColor: active ? "var(--foreground)" : "var(--divider)",
              background: active ? "var(--foreground)" : "transparent",
              color: active ? "var(--background)" : "var(--foreground)",
            }}
          >
            <MoodDot color={moodColorFor(opt.key) ?? "currentColor"} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
