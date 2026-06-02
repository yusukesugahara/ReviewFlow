import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DynamicFieldRendererProps } from "./dynamic-fields.types";

function FieldShell({
  field,
  name,
  disabled,
  readOnly,
  children,
  afterInput,
  variant,
}: DynamicFieldRendererProps & { children: ReactNode }) {
  const isTable = variant === "table";

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
      {children}
      {afterInput}
    </div>
  );
}

export function TextareaFieldInput(props: DynamicFieldRendererProps) {
  const { field, name, stringValue, disabled, readOnly, variant } = props;

  return (
    <FieldShell {...props}>
      <Textarea
        id={name}
        name={name}
        defaultValue={stringValue}
        placeholder={field.placeholder ?? ""}
        rows={variant === "table" ? 3 : 7}
        className={cn(
          variant === "table"
            ? "min-h-24 resize-y rounded-none border-slate-300 bg-white leading-6 shadow-none focus-visible:border-slate-900 focus-visible:ring-0"
            : "min-h-40",
          readOnly && "bg-slate-50 font-medium text-slate-950",
        )}
        disabled={disabled && !readOnly}
        readOnly={readOnly}
      />
    </FieldShell>
  );
}

export function SelectFieldInput(props: DynamicFieldRendererProps) {
  const { field, name, stringValue, disabled, readOnly, options, variant } = props;

  return (
    <FieldShell {...props}>
      <select
        id={name}
        name={name}
        defaultValue={stringValue}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full border bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          variant === "table"
            ? "rounded-none border-slate-300 bg-white shadow-none focus-visible:border-slate-900 focus-visible:ring-0"
            : "rounded-md border-input shadow-sm",
          readOnly && "bg-slate-50 font-medium text-slate-950 disabled:opacity-100",
        )}
      >
        <option value="">選択してください</option>
        {options.map((opt) => (
          <option key={`${field.id}-${opt.value}`} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldShell>
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

export function ScalarFieldInput(props: DynamicFieldRendererProps) {
  const { field, name, stringValue, disabled, readOnly, variant } = props;
  const inputType =
    field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : "text";

  return (
    <FieldShell {...props}>
      <Input
        id={name}
        name={name}
        type={inputType}
        defaultValue={stringValue}
        placeholder={field.placeholder ?? ""}
        disabled={disabled && !readOnly}
        readOnly={readOnly}
        inputMode={field.fieldType === "number" ? "decimal" : undefined}
        className={cn(
          variant === "table"
            ? cn(
                "rounded-none border-slate-300 bg-white shadow-none focus-visible:border-slate-900 focus-visible:ring-0",
                field.fieldType === "number" && "text-right tabular-nums",
                field.fieldType === "date" && "font-mono",
              )
            : undefined,
          readOnly && "bg-slate-50 font-medium text-slate-950",
        )}
      />
    </FieldShell>
  );
}
