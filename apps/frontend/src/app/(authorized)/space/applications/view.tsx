import { SpaceEmptyState } from "@/components/space/space-empty-state";

export function LegacySpaceApplicationsEmptyView({
  userRoles,
}: {
  userRoles: string[];
}) {
  return <SpaceEmptyState userRoles={userRoles} />;
}
