import { formatDateTimeJa } from "@/lib/date-format";
import type { SpaceDashboardSummary } from "./types";

export type DashboardTotals = {
  needsActionCount: number;
  returnedCount: number;
  totalApplications: number;
};

export type SpaceDashboardCardModel = SpaceDashboardSummary & {
  descriptionText: string;
  latestApplicationText: string;
  roleLabel: string;
};

export function buildDashboardTotals(
  spaces: SpaceDashboardSummary[],
): DashboardTotals {
  return spaces.reduce(
    (totals, space) => ({
      totalApplications: totals.totalApplications + space.totalApplications,
      needsActionCount: totals.needsActionCount + space.needsActionCount,
      returnedCount: totals.returnedCount + space.returnedCount,
    }),
    { totalApplications: 0, needsActionCount: 0, returnedCount: 0 },
  );
}

export function buildSpaceDashboardCardModel(
  space: SpaceDashboardSummary,
): SpaceDashboardCardModel {
  return {
    ...space,
    descriptionText: space.description ?? "説明は未設定です。",
    latestApplicationText: space.latestApplicationAt
      ? formatDateTimeJa(space.latestApplicationAt)
      : "まだ申請はありません",
    roleLabel: space.currentUserRole === "admin" ? "管理者" : "メンバー",
  };
}
