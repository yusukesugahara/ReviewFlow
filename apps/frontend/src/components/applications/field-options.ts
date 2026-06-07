import { z } from "zod";
import type { FieldOption } from "./dynamic-fields.types";

const fieldOptionObjectSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const fieldOptionsSchema = z.array(z.unknown());

export function normalizeFieldOptions(options: unknown[] | null | undefined): FieldOption[] {
  const parsed = fieldOptionsSchema.safeParse(options);
  if (!parsed.success) {
    return [];
  }

  return parsed.data.flatMap((option): FieldOption[] => {
    const stringOption = z.string().safeParse(option);
    if (stringOption.success) {
      return [{ value: stringOption.data, label: stringOption.data }];
    }

    const objectOption = fieldOptionObjectSchema.safeParse(option);
    return objectOption.success ? [objectOption.data] : [];
  });
}
