import { renderFieldValue } from "@/lib/form-field-value";
import type {
  ApplicationCorrection,
  ApplicationFormField,
} from "../detail/application-detail.types";

type CorrectionItemIdentity = Pick<
  ApplicationCorrection["items"][number],
  "fieldKey" | "formFieldId"
>;

/**
 * fieldKey を画面表示用のラベルに変換します。
 */
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

/**
 * 差戻し項目の表示ラベルを取得します。
 */
export function getCorrectionItemLabel(
  item: CorrectionItemIdentity,
  fields: ApplicationFormField[],
): string {
  const field = getCorrectionItemField(item, fields);
  return field?.label ?? formatFieldKeyLabel(item.fieldKey);
}

/**
 * 差戻し項目に対応するフォーム項目を取得します。
 */
export function getCorrectionItemField(
  item: CorrectionItemIdentity,
  fields: ApplicationFormField[],
): ApplicationFormField | undefined {
  return fields.find(
    (candidate) =>
      candidate.id === item.formFieldId || candidate.fieldKey === item.fieldKey,
  );
}

/**
 * 差戻し項目の提出値を表示用文字列に変換します。
 */
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
