import { SpaceApplicationsPageContent } from "@/app/(authorized)/space/_components/space-applications-page-content";
import type {
  SpaceApplicationsPageContentProps,
} from "@/app/(authorized)/space/_components/space-applications.types";

export function SpaceApplicationsView(props: SpaceApplicationsPageContentProps) {
  return <SpaceApplicationsPageContent {...props} />;
}
