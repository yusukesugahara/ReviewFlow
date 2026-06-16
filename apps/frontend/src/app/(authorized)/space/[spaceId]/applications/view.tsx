import type {
  SpaceApplicationsPageContentProps,
} from "@/components/space/space-applications.types";
import { SpaceApplicationsPageContent } from "./_components/space-applications-page-content";

/**
 * スペースの申請フォーム一覧画面を表示します。
 */
export function SpaceApplicationsView(props: SpaceApplicationsPageContentProps) {
  return <SpaceApplicationsPageContent {...props} />;
}
