import type { ApplicationFormField } from "@/components/applications/detail/application-detail.types";
import { isFormSetupStatus } from "@/components/applications/status/application-status-rules";
import type { ApplicationSummary } from "../types";

export function isRelatedSubmittedApplication(
  application: ApplicationSummary,
  definitionId?: string,
): boolean {
  return (
    application.formDefinitionId === definitionId &&
    !isFormSetupStatus(application.status)
  );
}

export function isSetupApplicationForDefinition(
  application: ApplicationSummary,
  definitionId: string,
): boolean {
  return (
    application.formDefinitionId === definitionId &&
    isFormSetupStatus(application.status)
  );
}

export function getMissingRequiredFields(
  fields: ApplicationFormField[],
  values: Record<string, unknown>,
): ApplicationFormField[] {
  return fields.filter(
    (field) => field.required && !hasRequiredValue(values[field.fieldKey]),
  );
}

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
