import { z } from "zod";
import { fieldTypeStoresValue } from "@/lib/constants/form-fields";
import type { DynamicFormField } from "./dynamic-fields.types";

const nonEmptyStringSchema = z.string().trim().min(1);
const stringValueSchema = z.string();
const stringArraySchema = z.array(z.string());

/**
 * 動的フォーム項目の FormData から申請値を読み取ります。
 */
export function readDynamicValuesFromFormData(
  fields: DynamicFormField[],
  formData: FormData,
  editableFieldKeys?: Set<string>,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    if (!fieldTypeStoresValue(field.fieldType)) {
      continue;
    }
    if (editableFieldKeys && !editableFieldKeys.has(field.fieldKey)) {
      continue;
    }
    const name = `field:${field.fieldKey}`;
    switch (field.fieldType) {
      case "number": {
        const raw = nonEmptyStringSchema.safeParse(formData.get(name));
        if (!raw.success) {
          break;
        }
        const num = Number(raw.data);
        if (Number.isFinite(num)) {
          values[field.fieldKey] = num;
        }
        break;
      }
      case "checkbox": {
        const raw = stringArraySchema.safeParse(formData.getAll(name));
        values[field.fieldKey] = raw.success ? raw.data : [];
        break;
      }
      case "consent": {
        values[field.fieldKey] = formData.get(name) === "true";
        break;
      }
      default: {
        const raw = stringValueSchema.safeParse(formData.get(name));
        if (raw.success) {
          values[field.fieldKey] = raw.data;
        }
        break;
      }
    }
  }
  return values;
}
