import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type DynamicFormField = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  options?: unknown[] | null;
};

type FieldOption = {
  value: string;
  label: string;
};

function normalizeFieldOptions(options: unknown[] | null | undefined): FieldOption[] {
  if (!Array.isArray(options)) {
    return [];
  }
  return options
    .map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt };
      }
      if (opt && typeof opt === "object") {
        const rec = opt as Record<string, unknown>;
        const value = rec.value;
        const label = rec.label;
        if (typeof value === "string" && typeof label === "string") {
          return { value, label };
        }
      }
      return null;
    })
    .filter((v): v is FieldOption => v !== null);
}

export function readDynamicValuesFromFormData(
  fields: DynamicFormField[],
  formData: FormData,
  editableFieldKeys?: Set<string>,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    if (editableFieldKeys && !editableFieldKeys.has(field.fieldKey)) {
      continue;
    }
    const name = `field:${field.fieldKey}`;
    switch (field.fieldType) {
      case "number": {
        const raw = formData.get(name);
        if (typeof raw !== "string" || raw.trim().length === 0) {
          break;
        }
        const num = Number(raw);
        if (Number.isFinite(num)) {
          values[field.fieldKey] = num;
        }
        break;
      }
      case "checkbox": {
        const raw = formData.getAll(name);
        values[field.fieldKey] = raw.filter((x): x is string => typeof x === "string");
        break;
      }
      default: {
        const raw = formData.get(name);
        if (typeof raw === "string") {
          values[field.fieldKey] = raw;
        }
        break;
      }
    }
  }
  return values;
}

type DynamicFieldInputProps = {
  field: DynamicFormField;
  value: unknown;
  disabled?: boolean;
  afterInput?: ReactNode;
};

export function DynamicFieldInput({
  field,
  value,
  disabled = false,
  afterInput,
}: DynamicFieldInputProps) {
  const name = `field:${field.fieldKey}`;
  const options = normalizeFieldOptions(field.options);
  const stringValue = typeof value === "string" ? value : "";
  const selectedValues = Array.isArray(value)
    ? value.filter((x): x is string => typeof x === "string")
    : [];

  if (field.fieldType === "textarea") {
    return (
      <div className={cn("space-y-2", disabled && "opacity-50")}>
        <Label htmlFor={name}>
          {field.label}
          {field.required ? <span className="text-destructive ml-1">*</span> : null}
        </Label>
        <Textarea
          id={name}
          name={name}
          defaultValue={stringValue}
          placeholder={field.placeholder ?? ""}
          rows={4}
          disabled={disabled}
        />
        {field.helpText ? <p className="text-sm text-muted-foreground">{field.helpText}</p> : null}
        {afterInput}
      </div>
    );
  }

  if (field.fieldType === "select") {
    return (
      <div className={cn("space-y-2", disabled && "opacity-50")}>
        <Label htmlFor={name}>
          {field.label}
          {field.required ? <span className="text-destructive ml-1">*</span> : null}
        </Label>
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
        {field.helpText ? <p className="text-sm text-muted-foreground">{field.helpText}</p> : null}
        {afterInput}
      </div>
    );
  }

  if (field.fieldType === "radio") {
    return (
      <div className={cn("space-y-2", disabled && "opacity-50")}>
        <Label>
          {field.label}
          {field.required ? <span className="text-destructive ml-1">*</span> : null}
        </Label>
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
        {field.helpText ? <p className="text-sm text-muted-foreground">{field.helpText}</p> : null}
        {afterInput}
      </div>
    );
  }

  if (field.fieldType === "checkbox") {
    return (
      <div className={cn("space-y-2", disabled && "opacity-50")}>
        <Label>
          {field.label}
          {field.required ? <span className="text-destructive ml-1">*</span> : null}
        </Label>
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
        {field.helpText ? <p className="text-sm text-muted-foreground">{field.helpText}</p> : null}
        {afterInput}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", disabled && "opacity-50")}>
      <Label htmlFor={name}>
        {field.label}
        {field.required ? <span className="text-destructive ml-1">*</span> : null}
      </Label>
      <Input
        id={name}
        name={name}
        type={field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : "text"}
        defaultValue={stringValue}
        placeholder={field.placeholder ?? ""}
        disabled={disabled}
      />
      {field.helpText ? <p className="text-sm text-muted-foreground">{field.helpText}</p> : null}
      {afterInput}
    </div>
  );
}
