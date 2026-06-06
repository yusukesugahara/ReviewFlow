export const FIELD_TYPES = {
  text: "text",
  textarea: "textarea",
  number: "number",
  date: "date",
  select: "select",
  radio: "radio",
  checkbox: "checkbox",
  consent: "consent",
  description: "description",
  section: "section",
} as const;

export type FieldType = (typeof FIELD_TYPES)[keyof typeof FIELD_TYPES];

export const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: FIELD_TYPES.text, label: "テキスト" },
  { value: FIELD_TYPES.textarea, label: "複数行テキスト" },
  { value: FIELD_TYPES.number, label: "数値" },
  { value: FIELD_TYPES.date, label: "日付" },
  { value: FIELD_TYPES.select, label: "選択" },
  { value: FIELD_TYPES.radio, label: "ラジオボタン" },
  { value: FIELD_TYPES.checkbox, label: "チェックボックス" },
  { value: FIELD_TYPES.consent, label: "同意チェック" },
  { value: FIELD_TYPES.description, label: "説明テキスト" },
  { value: FIELD_TYPES.section, label: "セクション見出し" },
];

export const FIELD_TYPES_REQUIRING_OPTIONS: readonly FieldType[] = [
  FIELD_TYPES.select,
  FIELD_TYPES.radio,
  FIELD_TYPES.checkbox,
];

export const FIELD_TYPES_WITHOUT_VALUES: readonly FieldType[] = [
  FIELD_TYPES.description,
  FIELD_TYPES.section,
];

export const FIELD_TYPES_SUPPORTING_PLACEHOLDER: readonly FieldType[] = [
  FIELD_TYPES.text,
  FIELD_TYPES.textarea,
  FIELD_TYPES.number,
  FIELD_TYPES.select,
];

export function isFieldType(value: string): value is FieldType {
  return FIELD_TYPE_OPTIONS.some((item) => item.value === value);
}

export function fieldTypeNeedsOptions(fieldType: string): boolean {
  return FIELD_TYPES_REQUIRING_OPTIONS.includes(fieldType as FieldType);
}

export function fieldTypeSupportsPlaceholder(fieldType: string): boolean {
  return FIELD_TYPES_SUPPORTING_PLACEHOLDER.includes(fieldType as FieldType);
}

export function fieldTypeStoresValue(fieldType: string): boolean {
  return !FIELD_TYPES_WITHOUT_VALUES.includes(fieldType as FieldType);
}
