import type { ApplicationRow } from "@/components/space/space-applications.types";
import type { ExportJobResponse } from "@/lib/schema";
import { SpaceSubmissionsPageContent } from "./_components/space-submissions-page-content";

type SpaceSubmissionsViewProps = {
  applications: ApplicationRow[];
  currentUserId: string | null;
  fetchErrorStatus?: number;
  filters: {
    applicant: string;
    createdFrom: string;
    createdTo: string;
    form: string;
    page: number;
    status: string;
    summary:
      | ""
      | "myNeedsAction"
      | "spaceNeedsAction"
      | "returned"
      | "recentProcessed";
  };
  latestExportJob: ExportJobResponse | null;
  spaceId: string;
};

/**
 * スペースの提出一覧画面を表示します。
 */
export function SpaceSubmissionsView(props: SpaceSubmissionsViewProps) {
  return <SpaceSubmissionsPageContent {...props} />;
}
