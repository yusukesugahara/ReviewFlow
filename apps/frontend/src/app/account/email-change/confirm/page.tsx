import { AccountEmailChangeConfirmView } from "./view";
import type { AccountEmailChangeConfirmPageProps } from "./types";

export default async function AccountEmailChangeConfirmPage({
  searchParams,
}: AccountEmailChangeConfirmPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <AccountEmailChangeConfirmView
      formError={params.formError}
      token={params.token ?? ""}
    />
  );
}
