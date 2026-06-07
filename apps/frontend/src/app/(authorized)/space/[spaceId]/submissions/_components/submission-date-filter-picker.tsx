"use client";

import { CalendarIcon, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { formatIsoDateDisplay, parseIsoDateValue } from "@/lib/iso-date";

type SubmissionDateFilterPickerProps = {
  id: string;
  name: string;
  defaultValue: string;
};

export function SubmissionDateFilterPicker({
  id,
  name,
  defaultValue,
}: SubmissionDateFilterPickerProps) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => parseDateValue(defaultValue) ?? new Date());
  const displayValue = useMemo(() => formatDisplayValue(value), [value]);

  return (
    <div className="relative">
      <input type="hidden" id={id} name={name} value={value} />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start bg-white text-left font-normal"
          onClick={() => setOpen((current) => !current)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <CalendarIcon className="size-4 text-slate-500" aria-hidden="true" />
          <span className={value ? "text-slate-900" : "text-slate-500"}>
            {displayValue || "日付を選択"}
          </span>
        </Button>
        {value ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="bg-white"
            aria-label="日付をクリア"
            onClick={() => setValue("")}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      {open ? (
        <div className="absolute left-0 top-11 z-40 w-max">
          <Calendar
            month={month}
            selected={value}
            onMonthChange={setMonth}
            onSelect={(nextValue) => {
              setValue(nextValue);
              setMonth(parseDateValue(nextValue) ?? month);
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function parseDateValue(value: string): Date | null {
  return parseIsoDateValue(value);
}

function formatDisplayValue(value: string): string {
  return formatIsoDateDisplay(value);
}
