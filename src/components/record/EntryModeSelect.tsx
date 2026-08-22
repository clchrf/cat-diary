"use client";

interface EntryModeSelectProps {
  onSelect: (mode: "record" | "text") => void;
}

export function EntryModeSelect({ onSelect }: EntryModeSelectProps) {
  return (
    <div className="flex flex-col gap-3 py-6">
      <button
        onClick={() => onSelect("record")}
        className="w-full rounded-2xl bg-foreground py-4 text-center text-[16px] font-medium text-background"
      >
        🎙️ 錄音
      </button>
      <button
        onClick={() => onSelect("text")}
        className="w-full rounded-2xl border border-divider py-4 text-center text-[16px] font-medium"
      >
        ✏️ 文字記錄
      </button>
    </div>
  );
}
