import { ForgotPasswordView } from "./view";
import type { ForgotPasswordPageProps } from "./types";

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <ForgotPasswordView
      sent={params.sent === "1"}
      formError={params.formError}
    />
  );
}
