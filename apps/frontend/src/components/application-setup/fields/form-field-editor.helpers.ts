import {
  FIELD_TYPES,
  isFieldType,
  type FieldType,
} from "@/lib/constants/form-fields";

/**
 * 文字列をサポート対象のフォーム項目種別に変換します。
 */
export function asFieldType(value: string): FieldType {
  return isFieldType(value) ? value : FIELD_TYPES.text;
}

/**
 * options 配列を編集フォーム用の改行区切りテキストに変換します。
 */
export function optionsToLines(options: unknown[] | null | undefined): string {
  if (!Array.isArray(options)) {
    return "";
  }
  return options
    .map((option) => {
      if (option && typeof option === "object") {
        const raw = option as { label?: unknown; value?: unknown };
        if (typeof raw.label === "string" && raw.label.trim().length > 0) {
          return raw.label.trim();
        }
        if (typeof raw.value === "string" && raw.value.trim().length > 0) {
          return raw.value.trim();
        }
      }
      if (typeof option === "string") {
        return option.trim();
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * 編集フォームの選択肢テキストを重複なしの配列に変換します。
 */
export function linesToOptions(optionsText: string): string[] {
  return optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, all) => line.length > 0 && all.indexOf(line) === index);
}
