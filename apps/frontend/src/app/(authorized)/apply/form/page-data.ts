import "server-only";

import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/server/backend-fetch";
import { applicantHeaders } from "./server";
import type {
  PublicApplicationFormDefinition,
  PublicApplicationFormPageProps,
} from "./types";

type PublicApplicationFormQuery = Awaited<
  NonNullable<PublicApplicationFormPageProps["searchParams"]>
>;

export async function getPublicApplicationFormPageData(
  query: PublicApplicationFormQuery,
): Promise<{
  definition: PublicApplicationFormDefinition;
  formError?: string;
}> {
  const response = await client.GET("/form-definitions/public/current", {
    headers: await applicantHeaders(),
  });

  return {
    definition: unwrapResponseData<PublicApplicationFormDefinition>(response),
    formError: getPublicFormError(query),
  };
}

function getPublicFormError(query: PublicApplicationFormQuery): string | undefined {
  return query.formError ?? (query.toast === "error" ? query.message : undefined);
}
