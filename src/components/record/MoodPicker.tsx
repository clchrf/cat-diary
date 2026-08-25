"use client";

import { EMOTION_OPTIONS, type EmotionKey } from "@/lib/types";
import { moodColorFor } from "@/lib/moodColors";
import { MoodDot } from "@/components/shared/MoodDot";

interface MoodPickerProps {
  selected: EmotionKey[];
  onChange: (selected: EmotionKey[]) => void;
  customText: string;
  onCustomTextChange: (text: string) => void;
}

export function MoodPicker({ selected, onChange, customText, onCustomTextChange }: MoodPickerProps) {
  function toggle(key: EmotionKey) {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[13px] font-medium text-foreground">實際情緒（可複選）</span>
      <div className="flex flex-wrap gap-2">
        {EMOTION_OPTIONS.map((opt) => {
          const active = selected.includes(opt.key);
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => toggle(opt.key)}
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
      <input
        value={customText}
        onChange={(e) => onCustomTextChange(e.target.value)}
        placeholder="自行輸入其他情緒"
        className="w-full rounded-xl border border-divider bg-transparent p-3 text-[14px] placeholder:text-muted focus:outline-none"
      />
    </div>
  );
}
