import { PublicApplicationAccessView } from "./view";
import type { PublicApplicationAccessPageProps } from "./types";

export default async function PublicApplicationAccessPage({
  params,
  searchParams,
}: PublicApplicationAccessPageProps) {
  const { groupId } = await params;
  const query = (await searchParams) ?? {};

  return (
    <PublicApplicationAccessView
      groupId={groupId}
      sent={query.sent === "1"}
      formError={query.formError}
      formDefinitionId={query.formDefinitionId ?? ""}
      toast={query.toast}
      message={query.message}
    />
  );
}
