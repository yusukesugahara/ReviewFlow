import type { ReactNode } from "react";

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

  const commonLabel = (
    <span>
      {field.label}
      {field.required ? " *" : ""}
    </span>
  );

  if (field.fieldType === "textarea") {
    return (
      <label style={{ display: "grid", gap: 4, opacity: disabled ? 0.55 : 1 }}>
        {commonLabel}
        <textarea
          name={name}
          defaultValue={stringValue}
          placeholder={field.placeholder ?? ""}
          rows={4}
          disabled={disabled}
        />
        {field.helpText ? <small>{field.helpText}</small> : null}
        {afterInput}
      </label>
    );
  }

  if (field.fieldType === "select") {
    return (
      <label style={{ display: "grid", gap: 4, opacity: disabled ? 0.55 : 1 }}>
        {commonLabel}
        <select name={name} defaultValue={stringValue} disabled={disabled}>
          <option value="">選択してください</option>
          {options.map((opt) => (
            <option key={`${field.id}-${opt.value}`} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {field.helpText ? <small>{field.helpText}</small> : null}
        {afterInput}
      </label>
    );
  }

  if (field.fieldType === "radio") {
    return (
      <fieldset style={{ display: "grid", gap: 4, opacity: disabled ? 0.55 : 1 }}>
        <legend>{commonLabel}</legend>
        {options.map((opt) => (
          <label key={`${field.id}-${opt.value}`}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              defaultChecked={stringValue === opt.value}
              disabled={disabled}
            />{" "}
            {opt.label}
          </label>
        ))}
        {field.helpText ? <small>{field.helpText}</small> : null}
        {afterInput}
      </fieldset>
    );
  }

  if (field.fieldType === "checkbox") {
    return (
      <fieldset style={{ display: "grid", gap: 4, opacity: disabled ? 0.55 : 1 }}>
        <legend>{commonLabel}</legend>
        {options.map((opt) => (
          <label key={`${field.id}-${opt.value}`}>
            <input
              type="checkbox"
              name={name}
              value={opt.value}
              defaultChecked={selectedValues.includes(opt.value)}
              disabled={disabled}
            />{" "}
            {opt.label}
          </label>
        ))}
        {field.helpText ? <small>{field.helpText}</small> : null}
        {afterInput}
      </fieldset>
    );
  }

  return (
    <label style={{ display: "grid", gap: 4, opacity: disabled ? 0.55 : 1 }}>
      {commonLabel}
      <input
        name={name}
        type={field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : "text"}
        defaultValue={stringValue}
        placeholder={field.placeholder ?? ""}
        disabled={disabled}
      />
      {field.helpText ? <small>{field.helpText}</small> : null}
      {afterInput}
    </label>
  );
}
