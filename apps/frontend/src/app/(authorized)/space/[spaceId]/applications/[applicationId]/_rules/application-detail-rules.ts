import type { ApplicationFormField } from "@/components/applications/detail/application-detail.types";
import { isFormSetupStatus } from "@/components/applications/status/application-status-rules";
import type { ApplicationSummary } from "../types";

/**
 * 申請が指定フォーム定義に紐づく提出済み申請かを判定します。
 */
export function isRelatedSubmittedApplication(
  application: ApplicationSummary,
  definitionId?: string,
): boolean {
  return (
    application.formDefinitionId === definitionId &&
    !isFormSetupStatus(application.status)
  );
}

/**
 * 申請が指定フォーム定義のセットアップ申請かを判定します。
 */
export function isSetupApplicationForDefinition(
  application: ApplicationSummary,
  definitionId: string,
): boolean {
  return (
    application.formDefinitionId === definitionId &&
    isFormSetupStatus(application.status)
  );
}

/**
 * 必須項目のうち、提出値がないフィールドを返します。
 */
export function getMissingRequiredFields(
  fields: ApplicationFormField[],
  values: Record<string, unknown>,
): ApplicationFormField[] {
  return fields.filter(
    (field) => field.required && !hasRequiredValue(values[field.fieldKey]),
  );
}

/**
 * フィールド値が必須項目を満たす値かを判定します。
 */
function hasRequiredValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}
