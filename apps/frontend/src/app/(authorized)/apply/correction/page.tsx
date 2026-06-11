import { isApiFailure } from "@/lib/server/api-failure";
import { getPublicCorrectionPageData } from "./page-data";
import type { PublicCorrectionPageProps } from "./types";
import {
  PublicCorrectionErrorView,
  PublicCorrectionResubmittedView,
  PublicCorrectionView,
} from "./view";

export default async function PublicCorrectionPage({
  searchParams,
}: PublicCorrectionPageProps) {
  const query = (await searchParams) ?? {};

  if (query.resubmitted === "1") {
    return <PublicCorrectionResubmittedView />;
  }

  try {
    const data = await getPublicCorrectionPageData(query);

    return (
      <PublicCorrectionView
        correction={data.correction}
        definition={data.definition}
        formError={data.formError}
      />
    );
  } catch (error) {
    return (
      <PublicCorrectionErrorView
        status={isApiFailure(error) ? error.status : undefined}
      />
    );
  }
}
