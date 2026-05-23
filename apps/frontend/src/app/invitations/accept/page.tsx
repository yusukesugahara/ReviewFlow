import { InvitationAcceptView } from "./view";
import type { InvitationAcceptPageProps } from "./types";

export default async function InvitationAcceptPage({ searchParams }: InvitationAcceptPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <InvitationAcceptView
      presetToken={params.token ?? ""}
      formError={params.formError}
      next={params.next ?? ""}
    />
  );
}
