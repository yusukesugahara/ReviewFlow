"use client";

import { CalendarIcon, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { formatIsoDateDisplay, parseIsoDateValue } from "@/lib/iso-date";
import { cn } from "@/lib/utils";
import type { DynamicFieldRendererProps } from "./dynamic-fields.types";

type CalendarPosition = {
  top: number;
  left: number;
};

export function DynamicDateFieldInput(props: DynamicFieldRendererProps) {
  const { field, name, stringValue, disabled, readOnly, afterInput, variant } = props;
  const isTable = variant === "table";
  const [value, setValue] = useState(stringValue);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => parseIsoDateValue(stringValue) ?? new Date());
  const [position, setPosition] = useState<CalendarPosition>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const displayValue = useMemo(() => formatIsoDateDisplay(value), [value]);

  useEffect(() => {
    if (!open || !triggerRef.current) {
      return;
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div
      className={cn(
        isTable ? "space-y-1" : "space-y-2",
        disabled && !readOnly && "opacity-50",
      )}
    >
      <Label htmlFor={name} className={isTable ? "sr-only" : undefined}>
        {field.label}
        {field.required ? <span className="text-destructive ml-1">*</span> : null}
      </Label>
      {field.helpText ? (
        <p className={cn(isTable ? "text-xs leading-5" : "text-sm", "text-muted-foreground")}>
          {field.helpText}
        </p>
      ) : null}
      {readOnly ? (
        <p
          className={cn(
            "text-sm text-slate-950",
            isTable && "min-h-9 border border-slate-300 bg-slate-50 px-3 py-2 font-medium",
          )}
        >
          {displayValue || "-"}
        </p>
      ) : (
        <div>
          <input type="hidden" id={name} name={name} value={value} />
          <div className="flex gap-2">
            <Button
              ref={triggerRef}
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-start bg-white text-left font-normal",
                isTable &&
                  "rounded-none border-slate-300 shadow-none hover:bg-white focus-visible:border-slate-900 focus-visible:ring-0",
              )}
              onClick={() => setOpen((current) => !current)}
              aria-haspopup="dialog"
              aria-expanded={open}
            >
              <CalendarIcon className="size-4 text-slate-500" aria-hidden="true" />
              <span className={value ? "text-slate-900" : "text-slate-500"}>
                {displayValue || field.placeholder || "日付を選択"}
              </span>
            </Button>
            {value ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={disabled}
                className={cn(
                  "bg-white",
                  isTable && "rounded-none border-slate-300 shadow-none",
                )}
                aria-label="日付をクリア"
                onClick={() => setValue("")}
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
          {open
            ? createPortal(
                <div
                  ref={popoverRef}
                  className="fixed z-50 w-max"
                  style={{ top: position.top, left: position.left }}
                >
                  <Calendar
                    month={month}
                    selected={value}
                    onMonthChange={setMonth}
                    onSelect={(nextValue) => {
                      setValue(nextValue);
                      setMonth(parseIsoDateValue(nextValue) ?? month);
                      setOpen(false);
                    }}
                  />
                </div>,
                document.body,
              )
            : null}
        </div>
      )}
      {afterInput}
    </div>
  );
}
