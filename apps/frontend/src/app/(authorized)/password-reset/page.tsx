import { PasswordResetView } from "./view";
import type { PasswordResetPageProps } from "./types";

export default async function PasswordResetPage({ searchParams }: PasswordResetPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <PasswordResetView
      token={params.token ?? ""}
      formError={params.formError}
    />
  );
}
