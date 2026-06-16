import { z } from "zod";
import type { DynamicFormField } from "./dynamic-fields.types";

const presentValueSchema = z.union([
  z.string().trim().min(1),
  z.number().finite(),
  z.boolean(),
  z.array(z.unknown()).min(1),
  z.record(z.string(), z.unknown()),
]);

export type DynamicFieldValidationResult = {
  fieldErrors: Record<string, string>;
  missingFieldLabels: string[];
};

/**
 * 動的フォームの必須項目が入力されているかを検証します。
 */
export function validateRequiredDynamicFields(
  fields: DynamicFormField[],
  values: Record<string, unknown>,
): DynamicFieldValidationResult {
  const fieldErrors: Record<string, string> = {};
  const missingFieldLabels: string[] = [];
  for (const field of fields) {
    if (field.required && !presentValueSchema.safeParse(values[field.fieldKey]).success) {
      fieldErrors[field.fieldKey] = "必須項目です";
      missingFieldLabels.push(field.label);
    }
  }
  return { fieldErrors, missingFieldLabels };
}
