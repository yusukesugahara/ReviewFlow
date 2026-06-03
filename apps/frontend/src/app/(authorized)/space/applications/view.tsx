import { SpaceEmptyState } from "@/app/(authorized)/space/_components/space-empty-state";

export function LegacySpaceApplicationsEmptyView({
  userRoles,
}: {
  userRoles: string[];
}) {
  return <SpaceEmptyState userRoles={userRoles} />;
}
