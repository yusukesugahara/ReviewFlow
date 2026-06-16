import { redirect } from "next/navigation";
import { getApplicationSetupRedirectTarget } from "./_utils/redirect-target";
import type { ApplicationSetupRedirectPageProps } from "./types";

/**
 * 旧申請セットアップルートから現在の新規申請画面へリダイレクトします。
 */
export default async function AdminApplicationSetupPage({
  searchParams,
}: ApplicationSetupRedirectPageProps) {
  const params = (await searchParams) ?? {};
  redirect(await getApplicationSetupRedirectTarget(params));
}
