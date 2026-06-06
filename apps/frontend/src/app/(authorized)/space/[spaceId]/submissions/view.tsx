import { SpaceSubmissionsPageContent } from "@/app/(authorized)/space/[spaceId]/submissions/_components/space-submissions-page-content";
import type { ApplicationRow } from "@/components/space/space-applications.types";
import type { ExportJobResponse } from "@/lib/schema";

type SpaceSubmissionsViewProps = {
  applications: ApplicationRow[];
  fetchErrorStatus?: number;
  filters: {
    applicant: string;
    createdFrom: string;
    createdTo: string;
    form: string;
    page: number;
    status: string;
    summary: "" | "needsAction" | "recentProcessed";
  };
  latestExportJob: ExportJobResponse | null;
  spaceId: string;
};

export function SpaceSubmissionsView(props: SpaceSubmissionsViewProps) {
  return <SpaceSubmissionsPageContent {...props} />;
}
