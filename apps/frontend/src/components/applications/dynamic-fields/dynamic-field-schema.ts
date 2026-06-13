import { z } from "zod";
import type { DynamicFormField } from "./dynamic-fields.types";

const dynamicFormFieldSchema = z.object({
  id: z.string(),
  fieldKey: z.string(),
  label: z.string(),
  fieldType: z.string(),
  required: z.boolean().catch(false),
  placeholder: z.string().nullable().optional(),
  helpText: z.string().nullable().optional(),
  options: z.array(z.unknown()).nullable().optional(),
});

const dynamicFormFieldsJsonSchema = z.array(z.unknown());

export function isDynamicFormField(value: unknown): value is DynamicFormField {
  return dynamicFormFieldSchema.safeParse(value).success;
}

export function parseDynamicFormFieldsJson(
  fieldsJson: FormDataEntryValue | string | null,
): DynamicFormField[] {
  if (typeof fieldsJson !== "string") {
    return [];
  }
  const parsed: unknown = JSON.parse(fieldsJson);
  const items = dynamicFormFieldsJsonSchema.safeParse(parsed);
  if (!items.success) {
    return [];
  }
  return items.data.flatMap((item): DynamicFormField[] => {
    const result = dynamicFormFieldSchema.safeParse(item);
    return result.success ? [result.data] : [];
  });
}
