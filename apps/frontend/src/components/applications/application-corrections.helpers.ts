import { renderFieldValue } from "@/lib/form-field-value";
import type {
  ApplicationCorrection,
  ApplicationFormField,
} from "./application-detail.types";

type CorrectionItemIdentity = Pick<
  ApplicationCorrection["items"][number],
  "fieldKey" | "formFieldId"
>;

export function formatFieldKeyLabel(fieldKey: string): string {
  return fieldKey
    .split("_")
    .filter(Boolean)
    .map((word) => {
      const dictionary: Record<string, string> = {
        address: "住所",
        applicant: "申請者",
        content: "内容",
        date: "日付",
        email: "メール",
        name: "氏名",
        phone: "電話番号",
        procedure: "手続き",
        reason: "理由",
        type: "種別",
      };
      return dictionary[word] ?? word;
    })
    .join("");
}

export function getCorrectionItemLabel(
  item: CorrectionItemIdentity,
  fields: ApplicationFormField[],
): string {
  const field = getCorrectionItemField(item, fields);
  return field?.label ?? formatFieldKeyLabel(item.fieldKey);
}

export function getCorrectionItemField(
  item: CorrectionItemIdentity,
  fields: ApplicationFormField[],
): ApplicationFormField | undefined {
  return fields.find(
    (candidate) =>
      candidate.id === item.formFieldId || candidate.fieldKey === item.fieldKey,
  );
}

export function formatCorrectionSubmittedValue({
  fields,
  item,
  values,
}: {
  fields: ApplicationFormField[];
  item: ApplicationCorrection["items"][number];
  values: Record<string, unknown>;
}): string {
  const field = getCorrectionItemField(item, fields);
  return field
    ? renderFieldValue(field, values[field.fieldKey])
    : renderFieldValue(
        {
          fieldType: "text",
        },
        values[item.fieldKey],
      );
}
