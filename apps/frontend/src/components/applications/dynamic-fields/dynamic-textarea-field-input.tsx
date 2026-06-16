import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DynamicFieldRendererProps } from "./dynamic-fields.types";
import { DynamicFieldShell } from "./dynamic-field-shell";

/**
 * 動的フォームの複数行テキスト入力を表示します。
 */
export function TextareaFieldInput(props: DynamicFieldRendererProps) {
  const { field, name, stringValue, disabled, readOnly, variant } = props;

  return (
    <DynamicFieldShell {...props}>
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
    </DynamicFieldShell>
  );
}
