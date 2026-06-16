import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DynamicDateFieldInput } from "./dynamic-date-field-input";
import { DynamicFieldShell } from "./dynamic-field-shell";
import type { DynamicFieldRendererProps } from "./dynamic-fields.types";

/**
 * 動的フォームの単一値入力を表示します。
 */
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
    <DynamicFieldShell {...props}>
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
    </DynamicFieldShell>
  );
}

/**
 * 数値入力の表示値から末尾の不要な小数点を取り除きます。
 */
export function formatNumberDisplayValue(value: string): string {
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
