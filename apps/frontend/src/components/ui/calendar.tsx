"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CalendarProps = {
  month: Date;
  selected?: string;
  onMonthChange: (month: Date) => void;
  onSelect: (value: string) => void;
};

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

const monthFormatter = new Intl.DateTimeFormat("ja-JP", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Tokyo",
});

/**
 * 単一日付選択用のカレンダー UI を表示します。
 */
export function Calendar({
  month,
  selected,
  onMonthChange,
  onSelect,
}: CalendarProps) {
  const days = useMemo(() => buildCalendarDays(month), [month]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="前の月"
          onClick={() => onMonthChange(addMonths(month, -1))}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <p className="text-sm font-semibold text-slate-900">
          {monthFormatter.format(month)}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="次の月"
          onClick={() => onMonthChange(addMonths(month, 1))}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdayLabels.map((label) => (
          <div key={label} className="py-1 text-xs font-medium text-slate-500">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const isSelected = selected === day.value;
          return (
            <button
              key={day.value}
              type="button"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                day.isCurrentMonth
                  ? "text-slate-900 hover:bg-slate-100"
                  : "text-slate-400 hover:bg-slate-50",
                isSelected &&
                  "bg-slate-900 text-white hover:bg-slate-900 hover:text-white",
              )}
              onClick={() => onSelect(day.value)}
            >
              {day.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 表示月に必要なカレンダー日付セルを組み立てます。
 */
function buildCalendarDays(month: Date): Array<{
  date: Date;
  isCurrentMonth: boolean;
  value: string;
}> {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      isCurrentMonth: date.getMonth() === month.getMonth(),
      value: formatDateValue(date),
    };
  });
}

/**
 * 指定日付に月数を加算した Date を返します。
 */
function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

/**
 * Date を yyyy-MM-dd 形式の入力値に変換します。
 */
function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
