import { SpaceApplicationsPageContent } from "@/app/space/_components/space-applications-page-content";
import type {
  SpaceApplicationsPageContentProps,
} from "@/app/space/_components/space-applications.types";

export function SpaceApplicationsView(props: SpaceApplicationsPageContentProps) {
  return <SpaceApplicationsPageContent {...props} />;
}
