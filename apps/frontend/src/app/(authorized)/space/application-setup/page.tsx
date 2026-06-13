import { redirect } from "next/navigation";
import { getApplicationSetupRedirectTarget } from "./_utils/redirect-target";
import type { ApplicationSetupRedirectPageProps } from "./types";

export default async function AdminApplicationSetupPage({
  searchParams,
}: ApplicationSetupRedirectPageProps) {
  const params = (await searchParams) ?? {};
  redirect(await getApplicationSetupRedirectTarget(params));
}
