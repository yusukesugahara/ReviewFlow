import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import { getSpaceLayoutSpaces } from "./actions";

export const dynamic = "force-dynamic";

type RootSpaceLayoutProps = {
  children: ReactNode;
};

export default async function RootSpaceLayout({ children }: RootSpaceLayoutProps) {
  const [spaces, me] = await Promise.all([
    getSpaceLayoutSpaces(),
    getCurrentSessionUser(),
  ]);

  return (
    <AppSidebar
      spaces={spaces}
      userEmail={me?.email}
      userRoles={me?.roles ?? []}
    >
      {children}
    </AppSidebar>
  );
}
