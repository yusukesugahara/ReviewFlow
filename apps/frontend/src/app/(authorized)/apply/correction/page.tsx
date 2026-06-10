import { client } from "@/lib/server/backend-fetch";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { isApiFailure } from "@/lib/server/api-failure";
import { applicantHeaders } from "../form/server";
import type {
  PublicCorrectionFormDefinition,
  PublicCorrectionPageProps,
  PublicCorrectionResponse,
} from "./types";
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
    const headers = await applicantHeaders();
    const [definitionRaw, correctionRaw] = await Promise.all([
      client.GET("/form-definitions/public/current", { headers }),
      client.GET("/public/applications/returned/current", { headers }),
    ]);

    return (
      <PublicCorrectionView
        correction={unwrapResponseData<PublicCorrectionResponse>(correctionRaw)}
        definition={
          unwrapResponseData<PublicCorrectionFormDefinition>(definitionRaw)
        }
        formError={
          query.formError ?? (query.toast === "error" ? query.message : undefined)
        }
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
