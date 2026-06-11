"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FIELD_TYPES,
  fieldTypeNeedsOptions,
  fieldTypeSupportsPlaceholder,
  type FieldType,
} from "@/lib/constants/form-fields";

type FormFieldTypeInputsProps = {
  disabled?: boolean;
  fieldType: FieldType;
  helpText: string;
  onHelpTextChange: (value: string) => void;
  onOptionsTextChange: (value: string) => void;
  onPlaceholderChange: (value: string) => void;
  optionsText: string;
  placeholder: string;
};

export function FormFieldTypeInputs({
  disabled,
  fieldType,
  helpText,
  onHelpTextChange,
  onOptionsTextChange,
  onPlaceholderChange,
  optionsText,
  placeholder,
}: FormFieldTypeInputsProps) {
  return (
    <div className="grid gap-3 border-t pt-3 md:grid-cols-2">
      {fieldTypeSupportsPlaceholder(fieldType) ? (
        <div className="space-y-2">
          <Label htmlFor={`placeholder-${fieldType}`}>プレースホルダー</Label>
          <Input
            id={`placeholder-${fieldType}`}
            name="placeholder"
            value={placeholder}
            onChange={(event) => onPlaceholderChange(event.target.value)}
            disabled={disabled}
            placeholder={
              fieldType === FIELD_TYPES.select
                ? "例: 選択してください"
                : "入力例や補足"
            }
            className="bg-white"
          />
        </div>
      ) : (
        <input type="hidden" name="placeholder" value="" />
      )}
      <div className="space-y-2">
        <Label htmlFor={`helpText-${fieldType}`}>説明文</Label>
        <Input
          id={`helpText-${fieldType}`}
          name="helpText"
          value={helpText}
          onChange={(event) => onHelpTextChange(event.target.value)}
          disabled={disabled}
          placeholder="入力欄の上に表示する説明"
          className="bg-white"
        />
      </div>
      {fieldTypeNeedsOptions(fieldType) ? (
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`options-${fieldType}`}>選択肢</Label>
          <Textarea
            id={`options-${fieldType}`}
            name="optionsText"
            value={optionsText}
            onChange={(event) => onOptionsTextChange(event.target.value)}
            disabled={disabled}
            required
            rows={4}
            placeholder={"承認する\n差し戻す\n却下する"}
            className="bg-white"
          />
        </div>
      ) : (
        <input type="hidden" name="optionsText" value="" />
      )}
    </div>
  );
}
