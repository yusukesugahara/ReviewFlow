import { SpaceEmptyState } from "@/components/space/space-empty-state";

/**
 * 旧申請一覧ルートで表示する空状態を表示します。
 */
export function LegacySpaceApplicationsEmptyView({
  userRoles,
}: {
  userRoles: string[];
}) {
  return <SpaceEmptyState userRoles={userRoles} />;
}
