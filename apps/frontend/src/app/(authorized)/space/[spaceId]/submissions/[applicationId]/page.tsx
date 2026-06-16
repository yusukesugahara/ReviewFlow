import SpaceApplicationDetailPage from "../../applications/[applicationId]/page";
import type { SpaceApplicationDetailPageProps } from "../../applications/[applicationId]/types";

/**
 * 旧提出詳細ルートを申請詳細ルートへリダイレクトします。
 */
export default function SpaceSubmissionDetailPage(
  props: SpaceApplicationDetailPageProps,
) {
  return <SpaceApplicationDetailPage {...props} />;
}
