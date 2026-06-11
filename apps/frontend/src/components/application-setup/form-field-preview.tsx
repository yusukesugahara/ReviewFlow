"use client";

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
import { FIELD_TYPES, type FieldType } from "@/lib/constants/form-fields";
import { linesToOptions } from "./form-field-editor.helpers";

type FormFieldPreviewProps = {
  fieldType: FieldType;
  helpText: string;
  label: string;
  optionsText: string;
  placeholder: string;
  required: boolean;
};

export function FormFieldPreview({
  fieldType,
  helpText,
  label,
  optionsText,
  placeholder,
  required,
}: FormFieldPreviewProps) {
  const options = linesToOptions(optionsText);
  const previewLabel = label.trim().length > 0 ? label.trim() : "タイトル";
  const previewPlaceholder = placeholder.trim();
  const fallbackOptions = options.length > 0 ? options : ["選択肢1", "選択肢2"];

  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <div className="space-y-2">
        <Label>
          {previewLabel}
          {required ? <span className="ml-1 text-destructive">*</span> : null}
        </Label>
        {helpText.trim().length > 0 ? (
          <p className="text-sm text-muted-foreground">{helpText.trim()}</p>
        ) : null}
        {fieldType === FIELD_TYPES.textarea ? (
          <Textarea
            placeholder={previewPlaceholder}
            rows={7}
            className="min-h-40 bg-white"
            disabled
          />
        ) : null}
        {fieldType === FIELD_TYPES.select ? (
          <Select disabled defaultValue="">
            <SelectTrigger className="bg-white disabled:opacity-100">
              <SelectValue placeholder={previewPlaceholder || "選択してください"} />
            </SelectTrigger>
            <SelectContent>
              {fallbackOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {fieldType === FIELD_TYPES.radio ? (
          <div className="space-y-2">
            {fallbackOptions.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" disabled className="h-4 w-4" />
                {option}
              </label>
            ))}
          </div>
        ) : null}
        {fieldType === FIELD_TYPES.checkbox ? (
          <div className="space-y-2">
            {fallbackOptions.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" disabled className="h-4 w-4 rounded border-gray-300" />
                {option}
              </label>
            ))}
          </div>
        ) : null}
        {fieldType === FIELD_TYPES.consent ? (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" disabled className="h-4 w-4 rounded border-gray-300" />
            {previewLabel}
          </label>
        ) : null}
        {fieldType === FIELD_TYPES.description ? (
          <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-700">
            {helpText.trim() || previewLabel}
          </p>
        ) : null}
        {fieldType === FIELD_TYPES.section ? (
          <div className="border-b border-slate-300 pb-2">
            <h3 className="text-lg font-semibold text-slate-950">{previewLabel}</h3>
            {helpText.trim().length > 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">{helpText.trim()}</p>
            ) : null}
          </div>
        ) : null}
        {fieldType !== FIELD_TYPES.textarea &&
        fieldType !== FIELD_TYPES.select &&
        fieldType !== FIELD_TYPES.radio &&
        fieldType !== FIELD_TYPES.checkbox &&
        fieldType !== FIELD_TYPES.consent &&
        fieldType !== FIELD_TYPES.description &&
        fieldType !== FIELD_TYPES.section ? (
          <Input
            type={
              fieldType === FIELD_TYPES.number
                ? "number"
                : fieldType === FIELD_TYPES.date
                  ? "date"
                  : "text"
            }
            placeholder={previewPlaceholder}
            disabled
            className="bg-white disabled:opacity-100"
          />
        ) : null}
      </div>
    </div>
  );
}
