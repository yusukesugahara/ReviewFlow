import { client } from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { isApiFailure } from "@/lib/server/api-error";
import type { PublicCurrentFormDefinitionSuccessJson } from "@/lib/schema";
import { applicantHeaders } from "./server";
import type { PublicApplicationFormDefinition, PublicApplicationFormPageProps } from "./types";
import {
  PublicApplicationFormErrorView,
  PublicApplicationFormView,
  PublicApplicationSubmittedView,
} from "./view";

export default async function PublicApplicationFormPage({
  searchParams,
}: PublicApplicationFormPageProps) {
  const query = (await searchParams) ?? {};

  if (query.submitted === "1") {
    return <PublicApplicationSubmittedView />;
  }

  try {
    const response = await client.GET("/form-definitions/public/current", {
      headers: await applicantHeaders(),
    });
    const data: PublicCurrentFormDefinitionSuccessJson | undefined = response.data;
    if (!response.response.ok || !data) {
      throw { status: response.response.status, body: response.error };
    }

    const definition = unwrapData<PublicApplicationFormDefinition>(data);
    return (
      <PublicApplicationFormView
        definition={definition}
        formError={
          query.formError ?? (query.toast === "error" ? query.message : undefined)
        }
      />
    );
  } catch (error) {
    return (
      <PublicApplicationFormErrorView
        status={isApiFailure(error) ? error.status : undefined}
      />
    );
  }
}
