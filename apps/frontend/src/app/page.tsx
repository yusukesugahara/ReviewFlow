import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import { MarketingHome } from "@/app/_components/marketing-home";
import { TENANT_ROLES } from "@/lib/constants/roles";

export const metadata: Metadata = {
  title: "ReviewFlow | 差し戻し・再提出まで追う業務ワークフロー SaaS",
  description:
    "提出受付から項目ごとの差し戻し、申請者の修正、再提出後の再確認、承認判断、監査ログまでを一元管理する ReviewFlow の製品トップページです。",
};

/**
 * 未ログインユーザーには製品トップを表示し、ログイン済みユーザーは権限別の初期画面へ送ります。
 */
export default async function RootPage() {
  const me = await getCurrentSessionUser();
  if (!me) {
    return <MarketingHome />;
  }

  if (me.roles.includes(TENANT_ROLES.admin)) {
    redirect("/admin/spaces");
  }
  redirect("/space");
}
