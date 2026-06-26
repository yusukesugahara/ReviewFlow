import { isApiFailure } from "@/lib/server/api-failure";
import { getPublicSubmissionPageData } from "./_data/page-data";
import {
  PublicSubmissionErrorView,
  PublicSubmissionView,
} from "./view";

/**
 * 申請者向け申請詳細画面のデータを読み込んで表示します。
 */
export default async function PublicSubmissionPage() {
  try {
    const data = await getPublicSubmissionPageData();
    return (
      <PublicSubmissionView
        application={data.application}
        definition={data.definition}
      />
    );
  } catch (error) {
    return (
      <PublicSubmissionErrorView
        status={isApiFailure(error) ? error.status : undefined}
      />
    );
  }
}

