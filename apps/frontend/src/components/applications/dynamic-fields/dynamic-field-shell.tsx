import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { DynamicFieldRendererProps } from "./dynamic-fields.types";

type DynamicFieldShellProps = DynamicFieldRendererProps & {
  children: ReactNode;
};

/**
 * 動的フォーム項目のラベル、補足、エラーを含む共通枠を表示します。
 */
export function DynamicFieldShell({
  field,
  name,
  disabled,
  readOnly,
  children,
  afterInput,
  variant,
}: DynamicFieldShellProps) {
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
