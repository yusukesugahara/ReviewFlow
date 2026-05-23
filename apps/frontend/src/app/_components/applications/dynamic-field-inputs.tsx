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
  children,
  afterInput,
}: DynamicFieldRendererProps & { children: ReactNode }) {
  return (
    <div className={cn("space-y-2", disabled && "opacity-50")}>
      <Label htmlFor={name}>
        {field.label}
        {field.required ? <span className="text-destructive ml-1">*</span> : null}
      </Label>
      {field.helpText ? <p className="text-sm text-muted-foreground">{field.helpText}</p> : null}
      {children}
      {afterInput}
    </div>
  );
}

export function TextareaFieldInput(props: DynamicFieldRendererProps) {
  const { field, name, stringValue, disabled } = props;

  return (
    <FieldShell {...props}>
      <Textarea
        id={name}
        name={name}
        defaultValue={stringValue}
        placeholder={field.placeholder ?? ""}
        rows={7}
        className="min-h-40"
        disabled={disabled}
      />
    </FieldShell>
  );
}

export function SelectFieldInput(props: DynamicFieldRendererProps) {
  const { field, name, stringValue, disabled, options } = props;

  return (
    <FieldShell {...props}>
      <select
        id={name}
        name={name}
        defaultValue={stringValue}
        disabled={disabled}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
  const { field, name, stringValue, disabled, options, afterInput } = props;

  return (
    <div className={cn("space-y-2", disabled && "opacity-50")}>
      <Label>
        {field.label}
        {field.required ? <span className="text-destructive ml-1">*</span> : null}
      </Label>
      {field.helpText ? <p className="text-sm text-muted-foreground">{field.helpText}</p> : null}
      <div className="space-y-2">
        {options.map((opt) => (
          <div key={`${field.id}-${opt.value}`} className="flex items-center space-x-2">
            <input
              type="radio"
              id={`${name}-${opt.value}`}
              name={name}
              value={opt.value}
              defaultChecked={stringValue === opt.value}
              disabled={disabled}
              className="h-4 w-4 border-gray-300"
            />
            <Label htmlFor={`${name}-${opt.value}`} className="font-normal">
              {opt.label}
            </Label>
          </div>
        ))}
      </div>
      {afterInput}
    </div>
  );
}

export function CheckboxFieldInput(props: DynamicFieldRendererProps) {
  const { field, name, selectedValues, disabled, options, afterInput } = props;

  return (
    <div className={cn("space-y-2", disabled && "opacity-50")}>
      <Label>
        {field.label}
        {field.required ? <span className="text-destructive ml-1">*</span> : null}
      </Label>
      {field.helpText ? <p className="text-sm text-muted-foreground">{field.helpText}</p> : null}
      <div className="space-y-2">
        {options.map((opt) => (
          <div key={`${field.id}-${opt.value}`} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`${name}-${opt.value}`}
              name={name}
              value={opt.value}
              defaultChecked={selectedValues.includes(opt.value)}
              disabled={disabled}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor={`${name}-${opt.value}`} className="font-normal">
              {opt.label}
            </Label>
          </div>
        ))}
      </div>
      {afterInput}
    </div>
  );
}

export function ScalarFieldInput(props: DynamicFieldRendererProps) {
  const { field, name, stringValue, disabled } = props;
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
        disabled={disabled}
      />
    </FieldShell>
  );
}
