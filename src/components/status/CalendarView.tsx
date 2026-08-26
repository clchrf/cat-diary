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
        Each cell used to be `aspect-square`, tying its height to its own
        (narrow, 1-of-7-column) width — on phone-width viewports that's
        less tall than the day number + mood dot + medication indicator
        actually need, so the extra content overflowed the cell's box and
        visually bled into the row below. min-height (sized for the real
        content) plus overflow-hidden fixes that at the cell level, so the
        indicators can never render outside their own day.
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
              className="flex flex-col items-center justify-center gap-1 overflow-hidden"
              style={{ opacity: cell.inMonth ? 1 : 0.28, minHeight: 52 }}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[13px] tabular-nums"
                style={{ background: cell.isToday ? "var(--divider)" : "transparent" }}
              >
                {cell.day}
              </span>
              <span style={{ width: 8, height: 8, display: "block" }}>{moodColor && <MoodDot color={moodColor} />}</span>
              <span style={{ height: 8, display: "flex", alignItems: "center" }}>
                {info?.medTaken && (
                  <span
                    style={{
                      display: "block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      border: "1.5px solid var(--muted)",
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
