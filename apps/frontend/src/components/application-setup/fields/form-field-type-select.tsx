"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_TYPE_OPTIONS, type FieldType } from "@/lib/constants/form-fields";
import { asFieldType } from "./form-field-editor.helpers";

type FormFieldTypeSelectProps = {
  disabled?: boolean;
  onChange: (value: FieldType) => void;
  value: FieldType;
};

/**
 * フォーム項目種別の選択 UI を表示します。
 */
export function FormFieldTypeSelect({
  disabled,
  onChange,
  value,
}: FormFieldTypeSelectProps) {
  return (
    <Select
      name="fieldType"
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) => onChange(asFieldType(nextValue))}
    >
      <SelectTrigger className="bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FIELD_TYPE_OPTIONS.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
