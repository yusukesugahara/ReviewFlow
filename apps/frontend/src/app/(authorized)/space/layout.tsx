import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import { getSpaceLayoutSpaces } from "./actions";

export const dynamic = "force-dynamic";

type RootSpaceLayoutProps = {
  children: ReactNode;
};

/**
 * スペース配下ページの共通レイアウトを表示します。
 */
export default async function RootSpaceLayout({ children }: RootSpaceLayoutProps) {
  const [spaces, me] = await Promise.all([
    getSpaceLayoutSpaces(),
    getCurrentSessionUser(),
  ]);

  return (
    <AppSidebar
      spaces={spaces}
      userEmail={me?.email}
      userName={me?.name}
      userRoles={me?.roles ?? []}
    >
      {children}
    </AppSidebar>
  );
}
