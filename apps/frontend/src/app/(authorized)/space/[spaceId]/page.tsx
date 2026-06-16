import { redirect } from "next/navigation";
import { buildSpaceApplicationsHref } from "@/components/applications/routing/application-routes";

/**
 * スペースルートを申請一覧へリダイレクトします。
 */
export default async function SpaceRedirectPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  redirect(buildSpaceApplicationsHref(spaceId));
}
