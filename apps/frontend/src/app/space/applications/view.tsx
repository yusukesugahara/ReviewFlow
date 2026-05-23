import { SpaceEmptyState } from "@/app/space/_components/space-empty-state";

export function LegacySpaceApplicationsEmptyView({
  userRoles,
}: {
  userRoles: string[];
}) {
  return <SpaceEmptyState userRoles={userRoles} />;
}
