import type {
  SpaceApplicationsPageContentProps,
} from "@/components/space/space-applications.types";
import { SpaceApplicationsPageContent } from "./_components/space-applications-page-content";

export function SpaceApplicationsView(props: SpaceApplicationsPageContentProps) {
  return <SpaceApplicationsPageContent {...props} />;
}
