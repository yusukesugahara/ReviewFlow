import "server-only";

import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/server/backend-fetch";
import { applicantHeaders } from "../../form/_utils/server";
import type {
  PublicCorrectionFormDefinition,
  PublicCorrectionPageProps,
  PublicCorrectionResponse,
} from "../types";

type PublicCorrectionQuery = Awaited<
  NonNullable<PublicCorrectionPageProps["searchParams"]>
>;

export async function getPublicCorrectionPageData(
  query: PublicCorrectionQuery,
): Promise<{
  correction: PublicCorrectionResponse;
  definition: PublicCorrectionFormDefinition;
  formError?: string;
}> {
  const headers = await applicantHeaders();
  const [definitionRaw, correctionRaw] = await Promise.all([
    client.GET("/form-definitions/public/current", { headers }),
    client.GET("/public/applications/returned/current", { headers }),
  ]);

  return {
    correction: unwrapResponseData<PublicCorrectionResponse>(correctionRaw),
    definition: unwrapResponseData<PublicCorrectionFormDefinition>(definitionRaw),
    formError: getPublicCorrectionFormError(query),
  };
}

function getPublicCorrectionFormError(
  query: PublicCorrectionQuery,
): string | undefined {
  return query.formError ?? (query.toast === "error" ? query.message : undefined);
}
