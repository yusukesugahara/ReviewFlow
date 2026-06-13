import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DynamicFieldRendererProps } from "./dynamic-fields.types";
import { DynamicFieldShell } from "./dynamic-field-shell";

export function SelectFieldInput(props: DynamicFieldRendererProps) {
  const { field, name, stringValue, disabled, readOnly, options, variant } = props;

  return (
    <DynamicFieldShell {...props}>
      <Select
        name={name}
        defaultValue={stringValue}
        disabled={disabled}
      >
        <SelectTrigger
          id={name}
          className={cn(
            "bg-transparent",
            variant === "table"
              ? "rounded-none border-slate-300 bg-white shadow-none focus:border-slate-900 focus:ring-0"
              : "border-input shadow-sm",
            readOnly && "bg-slate-50 font-medium text-slate-950 disabled:opacity-100",
          )}
        >
          <SelectValue placeholder="選択してください" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={`${field.id}-${opt.value}`} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </DynamicFieldShell>
  );
}

export function RadioFieldInput(props: DynamicFieldRendererProps) {
  const { field, name, stringValue, disabled, readOnly, options, afterInput, variant } = props;
  const isTable = variant === "table";

  return (
    <div className={cn(isTable ? "space-y-1" : "space-y-2", disabled && !readOnly && "opacity-50")}>
      <Label className={isTable ? "sr-only" : undefined}>
        {field.label}
        {field.required ? <span className="text-destructive ml-1">*</span> : null}
      </Label>
      {field.helpText ? (
        <p className={cn(isTable ? "text-xs leading-5" : "text-sm", "text-muted-foreground")}>
          {field.helpText}
        </p>
      ) : null}
      <div className={cn(isTable ? "grid gap-2 sm:grid-cols-2" : "space-y-2")}>
        {options.map((opt) => {
          const checked = stringValue === opt.value;
          return (
            <label
              key={`${field.id}-${opt.value}`}
              htmlFor={`${name}-${opt.value}`}
              className={cn(
                "flex items-center gap-2 text-sm",
                isTable && "min-h-9 border border-slate-300 bg-white px-3 py-2",
                readOnly &&
                  checked &&
                  "border-blue-300 bg-blue-50 font-semibold text-blue-950",
                readOnly && !checked && "bg-slate-50 text-slate-500",
              )}
            >
              <input
                type="radio"
                id={`${name}-${opt.value}`}
                name={name}
                value={opt.value}
                disabled={disabled}
                className="h-4 w-4 border-gray-300"
                {...(readOnly
                  ? { checked, readOnly: true }
                  : { defaultChecked: checked })}
              />
              <span className="break-words">{opt.label}</span>
            </label>
          );
        })}
      </div>
      {afterInput}
    </div>
  );
}

export function CheckboxFieldInput(props: DynamicFieldRendererProps) {
  const { field, name, selectedValues, disabled, readOnly, options, afterInput, variant } = props;
  const isTable = variant === "table";

  return (
    <div className={cn(isTable ? "space-y-1" : "space-y-2", disabled && !readOnly && "opacity-50")}>
      <Label className={isTable ? "sr-only" : undefined}>
        {field.label}
        {field.required ? <span className="text-destructive ml-1">*</span> : null}
      </Label>
      {field.helpText ? (
        <p className={cn(isTable ? "text-xs leading-5" : "text-sm", "text-muted-foreground")}>
          {field.helpText}
        </p>
      ) : null}
      <div className={cn(isTable ? "grid gap-2 sm:grid-cols-2" : "space-y-2")}>
        {options.map((opt) => {
          const checked = selectedValues.includes(opt.value);
          return (
            <label
              key={`${field.id}-${opt.value}`}
              htmlFor={`${name}-${opt.value}`}
              className={cn(
                "flex items-center gap-2 text-sm",
                isTable && "min-h-9 border border-slate-300 bg-white px-3 py-2",
                readOnly &&
                  checked &&
                  "border-blue-300 bg-blue-50 font-semibold text-blue-950",
                readOnly && !checked && "bg-slate-50 text-slate-500",
              )}
            >
              <input
                type="checkbox"
                id={`${name}-${opt.value}`}
                name={name}
                value={opt.value}
                disabled={disabled}
                className="h-4 w-4 rounded border-gray-300"
                {...(readOnly
                  ? { checked, readOnly: true }
                  : { defaultChecked: checked })}
              />
              <span className="break-words">{opt.label}</span>
            </label>
          );
        })}
      </div>
      {afterInput}
    </div>
  );
}
