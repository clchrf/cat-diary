"use client";

import { type EmotionKey } from "@/lib/types";
import { calendarGrid, formatMonthLabel } from "@/lib/date";
import { moodColorFor } from "@/lib/moodColors";
import { MoodDot } from "@/components/shared/MoodDot";

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

export function CalendarView({ year, month, data, onPrevMonth, onNextMonth, onSelectDay }: CalendarViewProps) {
  const cells = calendarGrid(year, month);

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-10 flex flex-col gap-3 bg-background pb-2">
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
      </div>

      {/*
        Each day cell is its own independent grid item (7 columns), with
        exactly two rows of content inside it: the date, then a single
        indicator row holding both dots. The two dots used to each live in
        their own stacked flex row with a 4px gap between — technically not
        overlapping in the DOM, but close enough together vertically that
        on real device pixel density they visually read as merged/on top
        of each other. Putting both in one flex row, side by side with
        their own horizontal gap, is the actual fix — not just an overflow
        clip. min-height + overflow-hidden (kept from last round) still
        guards against the cell itself ever bleeding into neighboring rows.
      */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const info = data[cell.dateKey];
          const moodColor = moodColorFor(info?.mood);
          return (
            <button
              key={cell.dateKey}
              onClick={() => cell.inMonth && onSelectDay(cell.dateKey)}
              disabled={!cell.inMonth}
              className="flex flex-col items-center justify-center gap-1.5 overflow-hidden"
              style={{ opacity: cell.inMonth ? 1 : 0.28, minHeight: 52 }}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[13px] tabular-nums"
                style={{ background: cell.isToday ? "var(--divider)" : "transparent" }}
              >
                {cell.day}
              </span>
              <span className="flex items-center justify-center gap-1.5" style={{ height: 8 }}>
                {moodColor && <MoodDot color={moodColor} />}
                {info?.medTaken && (
                  <span
                    style={{
                      display: "block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      border: "1.5px solid var(--muted)",
                      flexShrink: 0,
                    }}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
