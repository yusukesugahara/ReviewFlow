import { InvitationAcceptView } from "./view";
import type { InvitationAcceptPageProps } from "./types";

/**
 * 招待承諾画面をクエリ状態付きで表示します。
 */
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
