"use client";

import { type EmotionKey } from "@/lib/types";
import { calendarGrid, formatMonthLabel } from "@/lib/date";
import { moodColorFor } from "@/lib/moodColors";

export interface DayCellData {
  mood?: EmotionKey;
  medTaken: boolean;
  hasEvents: boolean;
}

interface CalendarViewProps {
  year: number;
  month: number;
  data: Record<string, DayCellData>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay: (dateKey: string) => void;
}

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

function PillIcon({ color = "var(--muted)" }: { color?: string }) {
  return (
    <svg width="11" height="6" viewBox="0 0 24 12" aria-hidden>
      <rect x="1" y="1" width="22" height="10" rx="5" fill="none" stroke={color} strokeWidth="1.5" />
      <line x1="12" y1="1" x2="12" y2="11" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export function CalendarView({ year, month, data, onPrevMonth, onNextMonth, onSelectDay }: CalendarViewProps) {
  const cells = calendarGrid(year, month);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button onClick={onPrevMonth} className="-m-2 p-2 text-[18px] text-muted" aria-label="上個月">
          ←
        </button>
        <span className="text-[16px] font-medium">{formatMonthLabel(year, month)}</span>
        <button onClick={onNextMonth} className="-m-2 p-2 text-[18px] text-muted" aria-label="下個月">
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const info = data[cell.dateKey];
          const moodColor = moodColorFor(info?.mood);
          return (
            <button
              key={cell.dateKey}
              onClick={() => cell.inMonth && onSelectDay(cell.dateKey)}
              disabled={!cell.inMonth}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg"
              style={{
                opacity: cell.inMonth ? 1 : 0.28,
                background: cell.isToday ? "var(--divider)" : "transparent",
                border: cell.isToday ? "1px solid var(--foreground)" : "1px solid transparent",
              }}
            >
              <span className="text-[13px] tabular-nums">{cell.day}</span>
              <span style={{ width: 7, height: 7, display: "block" }}>
                {moodColor && (
                  <span
                    style={{
                      display: "block",
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: moodColor,
                    }}
                  />
                )}
              </span>
              <span style={{ height: 6, display: "flex", alignItems: "center" }}>
                {info?.medTaken && <PillIcon />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
