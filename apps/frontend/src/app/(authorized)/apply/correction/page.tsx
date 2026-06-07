import { client } from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { isApiFailure } from "@/lib/server/api-error";
import type { PublicCurrentFormDefinitionSuccessJson } from "@/lib/schema";
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

    if (!definitionRaw.response.ok || !definitionRaw.data) {
      throw { status: definitionRaw.response.status, body: definitionRaw.error };
    }
    if (!correctionRaw.response.ok || !correctionRaw.data) {
      throw { status: correctionRaw.response.status, body: correctionRaw.error };
    }

    return (
      <PublicCorrectionView
        correction={unwrapData<PublicCorrectionResponse>(correctionRaw.data)}
        definition={unwrapData<PublicCorrectionFormDefinition>(
          definitionRaw.data as PublicCurrentFormDefinitionSuccessJson,
        )}
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
