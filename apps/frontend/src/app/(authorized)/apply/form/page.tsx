import { isApiFailure } from "@/lib/server/api-failure";
import { getPublicApplicationFormPageData } from "./_data/page-data";
import type { PublicApplicationFormPageProps } from "./types";
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
    const data = await getPublicApplicationFormPageData(query);
    return (
      <PublicApplicationFormView
        definition={data.definition}
        formError={data.formError}
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
