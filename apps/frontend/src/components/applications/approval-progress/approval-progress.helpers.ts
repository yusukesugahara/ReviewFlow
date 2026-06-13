import { formatDateTimeJa } from "@/lib/date-format";
import type {
  ApplicationCorrection,
  ApplicationFormField,
  ApplicationProgressStep,
  ApplicationProgressUser,
} from "../detail/application-detail.types";

export type FieldCorrectionItem = {
  correction: ApplicationCorrection;
  item: ApplicationCorrection["items"][number];
};

export function progressStatusMeta(status: ApplicationProgressStep["status"]) {
  if (status === "current") {
    return {
      label: "現在",
      badgeVariant: "default" as const,
      className: "border-blue-300 bg-blue-50 shadow-sm",
    };
  }
  if (status === "approved") {
    return {
      label: "承認済み",
      badgeVariant: "secondary" as const,
      className: "border-emerald-200 bg-emerald-50",
    };
  }
  if (status === "returned") {
    return {
      label: "差し戻し",
      badgeVariant: "outline" as const,
      className: "border-amber-300 bg-amber-50",
    };
  }
  if (status === "rejected") {
    return {
      label: "却下",
      badgeVariant: "destructive" as const,
      className: "border-red-300 bg-red-50",
    };
  }
  return {
    label: "未到達",
    badgeVariant: "outline" as const,
    className: "border-slate-200 bg-slate-50",
  };
}

export function isSelectableProgressStep(step: ApplicationProgressStep): boolean {
  return step.status !== "pending";
}

export function displayUser(user: ApplicationProgressUser): string {
  return user.name?.trim() || user.email;
}

export function actionLabel(action: string): string {
  if (action === "approved") {
    return "承認";
  }
  if (action === "returned") {
    return "差し戻し";
  }
  if (action === "rejected") {
    return "却下";
  }
  return action;
}

export function mapCorrectionsToReturnedActions(
  steps: ApplicationProgressStep[],
  corrections: ApplicationCorrection[],
): Map<string, ApplicationCorrection> {
  const returnedActions = steps
    .flatMap((step) =>
      step.actions
        .filter((action) => action.action === "returned")
        .map((action) => ({ stepOrder: step.stepOrder, action })),
    )
    .sort((a, b) => {
      const actedAtDiff =
        new Date(a.action.actedAt).getTime() - new Date(b.action.actedAt).getTime();
      return actedAtDiff !== 0 ? actedAtDiff : a.stepOrder - b.stepOrder;
    });
  const sortedCorrections = [...corrections].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const mapped = new Map<string, ApplicationCorrection>();
  returnedActions.forEach(({ action }, index) => {
    const correction = sortedCorrections[index];
    if (correction) {
      mapped.set(action.id, correction);
    }
  });
  return mapped;
}

export function getFieldCorrectionItems(
  corrections: ApplicationCorrection[],
  field: Pick<ApplicationFormField, "id" | "fieldKey">,
): FieldCorrectionItem[] {
  return corrections.flatMap((correction) =>
    correction.items
      .filter(
        (item) => item.formFieldId === field.id || item.fieldKey === field.fieldKey,
      )
      .map((item) => ({ correction, item })),
  );
}

export function formatDateTime(value?: string | null): string {
  return value ? formatDateTimeJa(value) : "-";
}
