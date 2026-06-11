import { cn } from "@/lib/utils";
import type { DynamicFieldRendererProps } from "./dynamic-fields.types";

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
