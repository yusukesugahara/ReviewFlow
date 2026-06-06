import { SpaceApplicationsPageContent } from "@/app/(authorized)/space/[spaceId]/applications/_components/space-applications-page-content";
import type {
  SpaceApplicationsPageContentProps,
} from "@/components/space/space-applications.types";

export function SpaceApplicationsView(props: SpaceApplicationsPageContentProps) {
  return <SpaceApplicationsPageContent {...props} />;
}
