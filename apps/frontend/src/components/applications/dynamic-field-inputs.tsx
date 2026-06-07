import type { ReactNode } from "react";
import { DynamicDateFieldInput } from "./dynamic-date-field-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function ConsentFieldInput(props: DynamicFieldRendererProps) {
  const { field, name, stringValue, disabled, readOnly, afterInput, variant } = props;
  const isTable = variant === "table";
  const checked = stringValue === "true";

  return (
    <div className={cn(isTable ? "space-y-1" : "space-y-2", disabled && !readOnly && "opacity-50")}>
      {field.helpText ? (
        <p className={cn(isTable ? "text-xs leading-5" : "text-sm", "text-muted-foreground")}>
          {field.helpText}
        </p>
      ) : null}
      <label
        htmlFor={name}
        className={cn(
          "flex items-start gap-2 text-sm",
          isTable && "min-h-9 border border-slate-300 bg-white px-3 py-2",
          readOnly && checked && "border-blue-300 bg-blue-50 font-semibold text-blue-950",
          readOnly && !checked && "bg-slate-50 text-slate-500",
        )}
      >
        <input
          type="checkbox"
          id={name}
          name={name}
          value="true"
          disabled={disabled}
          className="mt-0.5 h-4 w-4 rounded border-gray-300"
          {...(readOnly ? { checked, readOnly: true } : { defaultChecked: checked })}
        />
        <span className="break-words">
          {field.label}
          {field.required ? <span className="text-destructive ml-1">*</span> : null}
        </span>
      </label>
      {afterInput}
    </div>
  );
}

export function DescriptionFieldDisplay(props: DynamicFieldRendererProps) {
  const { field, afterInput, variant } = props;
  const isTable = variant === "table";
  const description = field.helpText?.trim() || field.placeholder?.trim() || field.label;

  return (
    <div className={cn(isTable ? "rounded-md border border-slate-200 bg-slate-50 px-3 py-2" : "rounded-lg border border-slate-200 bg-slate-50 px-4 py-3")}>
      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {description}
      </p>
      {afterInput}
    </div>
  );
}

export function SectionFieldDisplay(props: DynamicFieldRendererProps) {
  const { field, afterInput, variant } = props;
  const isTable = variant === "table";

  return (
    <div className={cn("border-b border-slate-300 pb-2", isTable && "border-b-0 pb-0")}>
      <h3 className={cn(isTable ? "text-base" : "text-lg", "font-semibold text-slate-950")}>
        {field.label}
      </h3>
      {field.helpText ? (
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {field.helpText}
        </p>
      ) : null}
      {afterInput}
    </div>
  );
}

export function ScalarFieldInput(props: DynamicFieldRendererProps) {
  const { field, name, stringValue, disabled, readOnly, variant } = props;
  if (field.fieldType === "date") {
    return <DynamicDateFieldInput {...props} />;
  }
  const isReadonlyNumber = readOnly && field.fieldType === "number";
  const inputType = field.fieldType === "number" && !isReadonlyNumber ? "number" : "text";
  const displayValue = isReadonlyNumber
    ? formatNumberDisplayValue(stringValue)
    : stringValue;

  return (
    <FieldShell {...props}>
      <Input
        id={name}
        name={name}
        type={inputType}
        defaultValue={displayValue}
        placeholder={field.placeholder ?? ""}
        disabled={disabled && !readOnly}
        readOnly={readOnly}
        inputMode={field.fieldType === "number" ? "decimal" : undefined}
        className={cn(
          variant === "table"
            ? cn(
                "rounded-none border-slate-300 bg-white shadow-none focus-visible:border-slate-900 focus-visible:ring-0",
                field.fieldType === "number" && "text-right tabular-nums",
              )
            : undefined,
          readOnly && "bg-slate-50 font-medium text-slate-950",
        )}
      />
    </FieldShell>
  );
}

function formatNumberDisplayValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const number = Number(trimmed);
  if (!Number.isFinite(number)) {
    return value;
  }
  return new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: 20,
  }).format(number);
}
