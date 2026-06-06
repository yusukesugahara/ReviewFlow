export const FormFieldType = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  DATE: 'date',
  SELECT: 'select',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  CONSENT: 'consent',
  DESCRIPTION: 'description',
  SECTION: 'section',
} as const;

export type FormFieldTypeValue =
  (typeof FormFieldType)[keyof typeof FormFieldType];

export const FORM_FIELD_TYPES: FormFieldTypeValue[] = [
  FormFieldType.TEXT,
  FormFieldType.TEXTAREA,
  FormFieldType.NUMBER,
  FormFieldType.DATE,
  FormFieldType.SELECT,
  FormFieldType.RADIO,
  FormFieldType.CHECKBOX,
  FormFieldType.CONSENT,
  FormFieldType.DESCRIPTION,
  FormFieldType.SECTION,
];

export const FORM_FIELD_TYPES_WITHOUT_VALUES: FormFieldTypeValue[] = [
  FormFieldType.DESCRIPTION,
  FormFieldType.SECTION,
];
